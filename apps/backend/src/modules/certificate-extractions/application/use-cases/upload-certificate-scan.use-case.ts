import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, CertificateAnalyteConfig } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { CertificateAnalyteTemplatesService } from '../../infrastructure/certificate-analyte-templates.service';
import { ClaudeCertificateOcrService } from '../../infrastructure/claude-certificate-ocr.service';
import {
  CERTIFICATE_EXTRACTION_REPOSITORY,
  CertificateExtractionRepository,
} from '../../domain/certificate-extraction.repository';
import {
  CERTIFICATE_REPOSITORY,
  CertificateRepository,
} from '../../../certificates/domain/certificate.repository';
import { assertNoPendingCertificateExtraction } from '../assert-no-pending-certificate-extraction.util';
import { assertNoExistingCertificate } from '../../../certificates/application/assert-no-existing-certificate.util';

@Injectable()
export class UploadCertificateScanUseCase {
  constructor(
    @Inject(CERTIFICATE_EXTRACTION_REPOSITORY)
    private readonly certificateExtractionRepository: CertificateExtractionRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepository,
    private readonly certificateAnalyteTemplatesService: CertificateAnalyteTemplatesService,
    private readonly claudeCertificateOcrService: ClaudeCertificateOcrService,
  ) {}

  async execute(sampleId: string, file: Express.Multer.File, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const sample = await this.sampleRepository.findById(sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    if (!sample.compoundId) {
      throw new BadRequestException(
        'Esta amostra não tem composto definido — não é possível identificar quais análises extrair do certificado.',
      );
    }

    const template = await this.certificateAnalyteTemplatesService.findByCompoundId(sample.compoundId);
    if (!template) {
      throw new BadRequestException(
        'Ainda não existe um modelo de leitura de certificado cadastrado para este composto.',
      );
    }

    const existingCertificates = await this.certificateRepository.findManyBySampleId(sampleId);
    assertNoExistingCertificate(existingCertificates);

    const existing = await this.certificateExtractionRepository.findManyBySampleId(sampleId);
    assertNoPendingCertificateExtraction(existing);

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const extraction = await this.certificateExtractionRepository.create(
      { sampleId, templateId: template.id },
      {
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );

    // Chamada síncrona (sem fila de job) — mesmo padrão de
    // UploadCustodyScanUseCase; laudos maiores (15+ páginas) levam alguns
    // segundos a mais, mas ainda dentro do timeout do request.
    try {
      const analytes = template.analytes as unknown as CertificateAnalyteConfig[];
      const extractedData = await this.claudeCertificateOcrService.extractCertificate(
        { buffer: file.buffer, mimeType: file.mimetype },
        analytes,
      );
      return this.certificateExtractionRepository.updateResult(extraction.id, {
        status: 'NEEDS_REVIEW',
        extractedData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.certificateExtractionRepository.updateResult(extraction.id, {
        status: 'FAILED',
        errorMessage: message,
      });
    }
  }
}
