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
export class DeleteCustodyDocumentUseCase {
  constructor(
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string) {
    const existing = await this.custodyDocumentRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Documento não encontrado.');
    }

    const { storageKey } = await this.custodyDocumentRepository.delete(id);
    await this.fileStorageService.delete(storageKey);
  }
}
