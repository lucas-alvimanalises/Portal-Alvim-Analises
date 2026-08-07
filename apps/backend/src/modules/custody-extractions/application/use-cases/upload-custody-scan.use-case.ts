import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, CustodyTemplateSchema } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { CustodyFieldTemplatesService } from '../../infrastructure/custody-field-templates.service';
import { ClaudeOcrService } from '../../infrastructure/claude-ocr.service';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';
import { assertNoActiveCustodyExtraction } from '../assert-no-active-custody-extraction.util';

@Injectable()
export class UploadCustodyScanUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    private readonly custodyFieldTemplatesService: CustodyFieldTemplatesService,
    private readonly claudeOcrService: ClaudeOcrService,
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
        'Esta amostra não tem composto definido — não é possível identificar o modelo de cadeia de custódia.',
      );
    }

    const template = await this.custodyFieldTemplatesService.findByCompoundId(sample.compoundId);
    if (!template) {
      throw new BadRequestException(
        'Ainda não existe um modelo de cadeia de custódia cadastrado para este composto.',
      );
    }

    const existing = await this.custodyExtractionRepository.findManyBySampleId(sampleId);
    assertNoActiveCustodyExtraction(existing);

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const extraction = await this.custodyExtractionRepository.create(
      { sampleId, templateId: template.id },
      {
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );

    // Chamada síncrona (sem fila de job) — leva poucos segundos e a app
    // ainda não tem infra de background job.
    try {
      const schema = template.fields as unknown as CustodyTemplateSchema;
      const extractedData = await this.claudeOcrService.extractCustodyForm(
        { buffer: file.buffer, mimeType: file.mimetype },
        schema,
      );
      return this.custodyExtractionRepository.updateResult(extraction.id, {
        status: 'NEEDS_REVIEW',
        extractedData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.custodyExtractionRepository.updateResult(extraction.id, {
        status: 'FAILED',
        errorMessage: message,
      });
    }
  }
}
