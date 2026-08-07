import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../domain/custody-document.repository';

@Injectable()
export class DownloadCustodyDocumentUseCase {
  constructor(
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string) {
    const document = await this.custodyDocumentRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Documento não encontrado.');
    }

    const stream = await this.fileStorageService.getStream(document.file.storageKey);
    return {
      stream,
      filename: document.file.filename,
      mimeType: document.file.mimeType,
    };
  }
}
