import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
  CustodyDocumentWithRelations,
} from '../../domain/custody-document.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';

export interface DedupeSkippedGroup {
  compoundCode: string;
  filename: string;
  documentIds: string[];
}

export interface DedupeResult {
  deleted: number;
  failures: { id: string; reason: string }[];
  skippedGroups: DedupeSkippedGroup[];
}

// Ação administrativa pontual (achado real, investigando relato do usuário
// de "pasta de Cadeia de Custódia com arquivos duplicados"): um lote
// histórico de cadeias de custódia foi importado em massa sem amostra
// vinculada (sampleId null) e, depois, cada uma foi reanexada por amostra
// (ver AttachExistingCustodyDocumentUseCase) sem checar se já existia —
// duplicando quase toda a pasta (mesmo composto+ano+nome de arquivo).
//
// Regra: só remove grupos de EXATAMENTE 2 documentos onde um tem sampleId
// nulo (a cópia órfã, que sai) e o outro tem sampleId preenchido (a cópia
// vinculada, que fica — é a que o resto do sistema reconhece). Qualquer
// grupo fora desse padrão (3+ cópias, ou 2 cópias já vinculadas a amostras
// diferentes) entra em skippedGroups pra revisão manual — nunca apagado
// automaticamente. Idempotente: rodar de novo sem duplicata nenhuma só
// devolve deleted:0.
@Injectable()
export class DedupeCustodyDocumentsUseCase {
  constructor(
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(): Promise<DedupeResult> {
    const documents = await this.custodyDocumentRepository.findMany();

    const byKey = new Map<string, CustodyDocumentWithRelations[]>();
    for (const doc of documents) {
      const key = `${doc.compoundId}|${doc.year}|${doc.file.filename}`;
      const list = byKey.get(key) ?? [];
      list.push(doc);
      byKey.set(key, list);
    }

    const toDelete: CustodyDocumentWithRelations[] = [];
    const skippedGroups: DedupeSkippedGroup[] = [];

    for (const list of byKey.values()) {
      if (list.length < 2) continue;
      const nulls = list.filter((d) => !d.sampleId);
      const linked = list.filter((d) => d.sampleId);
      if (list.length === 2 && nulls.length === 1 && linked.length === 1) {
        toDelete.push(nulls[0]);
      } else {
        skippedGroups.push({
          compoundCode: list[0].compound.code,
          filename: list[0].file.filename,
          documentIds: list.map((d) => d.id),
        });
      }
    }

    let deleted = 0;
    const failures: { id: string; reason: string }[] = [];
    for (const doc of toDelete) {
      try {
        const { storageKey } = await this.custodyDocumentRepository.delete(doc.id);
        await this.fileStorageService.delete(storageKey);
        deleted += 1;
      } catch (error) {
        failures.push({ id: doc.id, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    return { deleted, failures, skippedGroups };
  }
}
