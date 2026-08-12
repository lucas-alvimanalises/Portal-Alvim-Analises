import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, rm, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { AppConfig } from '../../../config/configuration';
import { sanitizeFilename } from '../../../common/utils/filename.util';
import {
  FileStorageService,
  UploadFileInput,
  UploadFileResult,
} from '../domain/file-storage.interface';

@Injectable()
export class LocalFileStorageService implements FileStorageService {
  private readonly basePath: string;

  constructor(configService: ConfigService) {
    const appConfig = configService.get<AppConfig>('app')!;
    this.basePath = appConfig.fileStorage.localPath;
  }

  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    await mkdir(this.basePath, { recursive: true });
    // input.filename vem direto do upload (Multer file.originalname) — nunca
    // confiar nele sem tratar: basename() descarta qualquer componente de
    // diretório (inclusive "../../etc/passwd") e sanitizeFilename() troca os
    // caracteres restantes que ainda poderiam confundir o path (barra
    // invertida, dois-pontos, etc.) por espaço. Sem isso, um nome de arquivo
    // malicioso conseguia escapar de basePath e escrever em qualquer lugar
    // que o processo tivesse permissão (falha real, achada em auditoria).
    const safeFilename = sanitizeFilename(basename(input.filename)) || 'arquivo';
    const storageKey = `${randomUUID()}-${safeFilename}`;
    await writeFile(join(this.basePath, storageKey), input.buffer);
    return { storageKey, sizeBytes: input.buffer.byteLength };
  }

  getUrl(storageKey: string): string {
    return `/api/attachments/files/${encodeURIComponent(storageKey)}`;
  }

  async delete(storageKey: string): Promise<void> {
    await rm(join(this.basePath, storageKey), { force: true });
  }

  async getStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const filePath = join(this.basePath, storageKey);
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Arquivo não encontrado.');
    }
    return createReadStream(filePath);
  }
}
