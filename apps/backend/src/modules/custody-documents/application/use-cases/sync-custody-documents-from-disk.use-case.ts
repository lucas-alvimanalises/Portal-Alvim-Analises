import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Dirent } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { AppConfig } from '../../../../config/configuration';
import { CompoundsService } from '../../../compounds/compounds.service';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../domain/custody-document.repository';

export interface SyncFailure {
  file: string;
  reason: string;
}

export interface SyncResult {
  scanned: number;
  uploaded: number;
  skipped: number;
  failures: SyncFailure[];
}

// Varre a pasta local configurada (CUSTODY_DOCUMENTS_SYNC_ROOT, mesma
// máquina do backend) — {raiz}/{código} - {composto}/{ano}/*.pdf — e sobe
// pra plataforma qualquer PDF que ainda não exista (comparando
// composto+ano+nome do arquivo). Solução de transição enquanto a Alvim
// ainda usa o OneDrive no dia a dia, até tudo passar a ser carregado direto
// na plataforma (ver AmostrasPage). Lê os arquivos direto do disco (sem
// multipart/busboy no caminho), então não precisa do fix de encoding de
// filename usado nos uploads via formulário.
@Injectable()
export class SyncCustodyDocumentsFromDiskUseCase {
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly compoundsService: CompoundsService,
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(user: AuthenticatedUser): Promise<SyncResult> {
    if (this.running) {
      throw new ConflictException('Já existe uma sincronização em andamento.');
    }

    const appConfig = this.configService.get<AppConfig>('app')!;
    const root = appConfig.custodyDocumentsSyncRoot;
    if (!root) {
      throw new BadRequestException(
        'CUSTODY_DOCUMENTS_SYNC_ROOT não configurado no backend — não há pasta local pra sincronizar.',
      );
    }

    this.running = true;
    try {
      return await this.sync(root, user);
    } finally {
      this.running = false;
    }
  }

  private async sync(root: string, user: AuthenticatedUser): Promise<SyncResult> {
    const compounds = await this.compoundsService.findMany();
    const existingDocuments = await this.custodyDocumentRepository.findMany();
    const existingKeys = new Set(
      existingDocuments.map((doc) => `${doc.compoundId}|${doc.year}|${doc.file.filename}`),
    );

    let rootEntries: Dirent[];
    try {
      rootEntries = await readdir(root, { withFileTypes: true });
    } catch (error) {
      throw new BadRequestException(`Não foi possível ler a pasta configurada: ${error}`);
    }

    let scanned = 0;
    let uploaded = 0;
    let skipped = 0;
    const failures: SyncFailure[] = [];

    const compoundFolders = rootEntries.filter((entry) => entry.isDirectory());

    for (const folder of compoundFolders) {
      const match = /^(\d+)\s*-\s*.+$/.exec(folder.name);
      if (!match) continue;
      const compound = compounds.find((c) => c.code === match[1]);
      if (!compound) continue;

      const compoundPath = join(root, folder.name);
      const yearEntries = await readdir(compoundPath, { withFileTypes: true });
      const yearFolders = yearEntries.filter(
        (entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name),
      );

      for (const yearFolder of yearFolders) {
        const year = Number(yearFolder.name);
        const yearPath = join(compoundPath, yearFolder.name);
        const files = await readdir(yearPath, { withFileTypes: true });
        const pdfFiles = files.filter(
          (file) => file.isFile() && file.name.toLowerCase().endsWith('.pdf'),
        );

        for (const file of pdfFiles) {
          scanned += 1;
          const key = `${compound.id}|${year}|${file.name}`;
          if (existingKeys.has(key)) {
            skipped += 1;
            continue;
          }

          const filePath = join(yearPath, file.name);
          try {
            const buffer = await readFile(filePath);
            const uploadedFile = await this.fileStorageService.upload({
              buffer,
              filename: file.name,
              mimeType: 'application/pdf',
            });
            await this.custodyDocumentRepository.create(
              { compoundId: compound.id, year, uploadedById: user.id },
              {
                storageKey: uploadedFile.storageKey,
                filename: file.name,
                mimeType: 'application/pdf',
                sizeBytes: uploadedFile.sizeBytes,
                uploadedById: user.id,
              },
            );
            uploaded += 1;
            existingKeys.add(key);
          } catch (error) {
            failures.push({ file: filePath, reason: String(error) });
          }
        }
      }
    }

    return { scanned, uploaded, skipped, failures };
  }
}
