import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { CERTIFICATE_REPOSITORY, CertificateRepository } from '../../domain/certificate.repository';

// Baixa o certificado direto pela amostra (sem o front precisar descobrir o
// id do certificado antes) — usado no download em lote de Resultados/
// Histórico. Só existe 1 certificado por amostra (ver
// UploadCertificateUseCase), então pega o primeiro.
@Injectable()
export class DownloadCertificateBySampleUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(sampleId: string, user: AuthenticatedUser) {
    const sample = await this.sampleRepository.findById(sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    const certificates = await this.certificateRepository.findManyBySampleId(sampleId);
    const certificate = certificates[0];
    if (!certificate) {
      throw new NotFoundException('Certificado não encontrado para esta amostra.');
    }

    const stream = await this.fileStorageService.getStream(certificate.file.storageKey);
    return {
      stream,
      filename: certificate.file.filename,
      mimeType: certificate.file.mimeType,
    };
  }
}
