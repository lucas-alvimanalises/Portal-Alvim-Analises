import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
  CustodyDocumentWithRelations,
} from '../../domain/custody-document.repository';

// Nº do relatório embutido no nome do arquivo (ex.: "11177_26 - Cadeia de
// Custódia Siloxanos.pdf" → 11177) — é a identidade "de verdade" de cada
// cadeia de custódia (sequencial por composto, ver ApproveCustodyExtractionUseCase),
// bem mais confiável pra ordenar do que a data de upload: um lote de
// documentos antigos importado/anexado de uma vez (ex.: histórico de meses
// anteriores subido tudo no mesmo dia) tem createdAt quase igual pra
// arquivos de números bem diferentes, embaralhando a lista. -1 (não
// reconhecido) vai pro fim, dentro do mesmo ano.
function parseReportNumber(filename: string): number {
  const match = /^(\d+)_\d{2}\s*-/.exec(filename);
  return match ? Number(match[1]) : -1;
}

@Injectable()
export class ListCustodyDocumentsUseCase {
  constructor(
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
  ) {}

  async execute(compoundId?: string): Promise<CustodyDocumentWithRelations[]> {
    const documents = await this.custodyDocumentRepository.findMany(compoundId);
    return [...documents].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const numberDiff = parseReportNumber(b.file.filename) - parseReportNumber(a.file.filename);
      if (numberDiff !== 0) return numberDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
}
