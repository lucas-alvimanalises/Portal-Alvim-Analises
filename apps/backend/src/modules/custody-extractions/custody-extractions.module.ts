import { Module } from '@nestjs/common';
import { SamplesModule } from '../samples/samples.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { CustodyDocumentsModule } from '../custody-documents/custody-documents.module';
import { UsersModule } from '../users/users.module';
import { CUSTODY_EXTRACTION_REPOSITORY } from './domain/custody-extraction.repository';
import { PrismaCustodyExtractionRepository } from './infrastructure/prisma-custody-extraction.repository';
import { CustodyFieldTemplatesService } from './infrastructure/custody-field-templates.service';
import { ClaudeOcrService } from './infrastructure/claude-ocr.service';
import { CustodyExtractionsController } from './infrastructure/custody-extractions.controller';
import { UploadCustodyScanUseCase } from './application/use-cases/upload-custody-scan.use-case';
import { CreateManualCustodyExtractionUseCase } from './application/use-cases/create-manual-custody-extraction.use-case';
import { GetCustodyExtractionUseCase } from './application/use-cases/get-custody-extraction.use-case';
import { ListCustodyExtractionsBySampleUseCase } from './application/use-cases/list-custody-extractions-by-sample.use-case';
import { UpdateCustodyExtractionUseCase } from './application/use-cases/update-custody-extraction.use-case';
import { ApproveCustodyExtractionUseCase } from './application/use-cases/approve-custody-extraction.use-case';
import { DownloadCustodyScanUseCase } from './application/use-cases/download-custody-scan.use-case';
import { SelectCustodyExtractionPhotoUseCase } from './application/use-cases/select-custody-extraction-photo.use-case';
import { DeleteCustodyExtractionUseCase } from './application/use-cases/delete-custody-extraction.use-case';
import { AttachExistingCustodyDocumentUseCase } from './application/use-cases/attach-existing-custody-document.use-case';
import { DownloadCustodyDocumentBySampleUseCase } from './application/use-cases/download-custody-document-by-sample.use-case';
import { DownloadBlankCustodyChainsUseCase } from './application/use-cases/download-blank-custody-chains.use-case';

@Module({
  imports: [SamplesModule, AttachmentsModule, CustodyDocumentsModule, UsersModule],
  controllers: [CustodyExtractionsController],
  providers: [
    { provide: CUSTODY_EXTRACTION_REPOSITORY, useClass: PrismaCustodyExtractionRepository },
    CustodyFieldTemplatesService,
    ClaudeOcrService,
    UploadCustodyScanUseCase,
    CreateManualCustodyExtractionUseCase,
    GetCustodyExtractionUseCase,
    ListCustodyExtractionsBySampleUseCase,
    UpdateCustodyExtractionUseCase,
    ApproveCustodyExtractionUseCase,
    DownloadCustodyScanUseCase,
    SelectCustodyExtractionPhotoUseCase,
    DeleteCustodyExtractionUseCase,
    AttachExistingCustodyDocumentUseCase,
    DownloadCustodyDocumentBySampleUseCase,
    DownloadBlankCustodyChainsUseCase,
  ],
})
export class CustodyExtractionsModule {}
