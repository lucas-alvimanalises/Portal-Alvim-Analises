import { Module } from '@nestjs/common';
import { SamplesModule } from '../samples/samples.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { CERTIFICATE_REPOSITORY } from './domain/certificate.repository';
import { PrismaCertificateRepository } from './infrastructure/prisma-certificate.repository';
import { CertificatesController } from './infrastructure/certificates.controller';
import { ListCertificatesUseCase } from './application/use-cases/list-certificates.use-case';
import { UploadCertificateUseCase } from './application/use-cases/upload-certificate.use-case';
import { ReplaceCertificateFileUseCase } from './application/use-cases/replace-certificate-file.use-case';
import { UpdateCertificateMetadataUseCase } from './application/use-cases/update-certificate-metadata.use-case';
import { DeleteCertificateUseCase } from './application/use-cases/delete-certificate.use-case';
import { DownloadCertificateUseCase } from './application/use-cases/download-certificate.use-case';
import { DownloadCertificateBySampleUseCase } from './application/use-cases/download-certificate-by-sample.use-case';

@Module({
  imports: [SamplesModule, AttachmentsModule],
  controllers: [CertificatesController],
  providers: [
    { provide: CERTIFICATE_REPOSITORY, useClass: PrismaCertificateRepository },
    ListCertificatesUseCase,
    UploadCertificateUseCase,
    ReplaceCertificateFileUseCase,
    UpdateCertificateMetadataUseCase,
    DeleteCertificateUseCase,
    DownloadCertificateUseCase,
    DownloadCertificateBySampleUseCase,
  ],
  exports: [CERTIFICATE_REPOSITORY],
})
export class CertificatesModule {}
