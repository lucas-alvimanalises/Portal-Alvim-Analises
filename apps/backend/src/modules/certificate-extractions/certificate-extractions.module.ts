import { Module } from '@nestjs/common';
import { SamplesModule } from '../samples/samples.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { CERTIFICATE_EXTRACTION_REPOSITORY } from './domain/certificate-extraction.repository';
import { PrismaCertificateExtractionRepository } from './infrastructure/prisma-certificate-extraction.repository';
import { CertificateAnalyteTemplatesService } from './infrastructure/certificate-analyte-templates.service';
import { ClaudeCertificateOcrService } from './infrastructure/claude-certificate-ocr.service';
import { CertificateExtractionsController } from './infrastructure/certificate-extractions.controller';
import { UploadCertificateScanUseCase } from './application/use-cases/upload-certificate-scan.use-case';
import { GetCertificateExtractionUseCase } from './application/use-cases/get-certificate-extraction.use-case';
import { ListCertificateExtractionsBySampleUseCase } from './application/use-cases/list-certificate-extractions-by-sample.use-case';
import { UpdateCertificateExtractionUseCase } from './application/use-cases/update-certificate-extraction.use-case';
import { ApproveCertificateExtractionUseCase } from './application/use-cases/approve-certificate-extraction.use-case';
import { DownloadCertificateScanUseCase } from './application/use-cases/download-certificate-scan.use-case';
import { DeleteCertificateExtractionUseCase } from './application/use-cases/delete-certificate-extraction.use-case';

@Module({
  imports: [SamplesModule, AttachmentsModule, CertificatesModule],
  controllers: [CertificateExtractionsController],
  providers: [
    { provide: CERTIFICATE_EXTRACTION_REPOSITORY, useClass: PrismaCertificateExtractionRepository },
    CertificateAnalyteTemplatesService,
    ClaudeCertificateOcrService,
    UploadCertificateScanUseCase,
    GetCertificateExtractionUseCase,
    ListCertificateExtractionsBySampleUseCase,
    UpdateCertificateExtractionUseCase,
    ApproveCertificateExtractionUseCase,
    DownloadCertificateScanUseCase,
    DeleteCertificateExtractionUseCase,
  ],
})
export class CertificateExtractionsModule {}
