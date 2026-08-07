import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { access, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { AppConfig } from '../../../config/configuration';
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
    const storageKey = `${randomUUID()}-${input.filename}`;
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
