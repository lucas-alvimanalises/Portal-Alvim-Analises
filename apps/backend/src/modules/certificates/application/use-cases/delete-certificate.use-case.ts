import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { CERTIFICATE_REPOSITORY, CertificateRepository } from '../../domain/certificate.repository';

@Injectable()
export class DeleteCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const existing = await this.certificateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Certificado não encontrado.');
    }
    const sample = await this.sampleRepository.findById(existing.sampleId);
    assertOwnership(user, { clientId: sample?.clientId });

    const { storageKey } = await this.certificateRepository.delete(id);
    await this.fileStorageService.delete(storageKey);
  }
}
