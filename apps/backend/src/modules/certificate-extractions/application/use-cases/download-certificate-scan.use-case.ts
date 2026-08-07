import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CERTIFICATE_EXTRACTION_REPOSITORY,
  CertificateExtractionRepository,
} from '../../domain/certificate-extraction.repository';

@Injectable()
export class DownloadCertificateScanUseCase {
  constructor(
    @Inject(CERTIFICATE_EXTRACTION_REPOSITORY)
    private readonly certificateExtractionRepository: CertificateExtractionRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.certificateExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    assertOwnership(user, { clientId: extraction.sample.clientId });

    const stream = await this.fileStorageService.getStream(extraction.originalScanFile.storageKey);
    return {
      stream,
      filename: extraction.originalScanFile.filename,
      mimeType: extraction.originalScanFile.mimeType,
    };
  }
}
