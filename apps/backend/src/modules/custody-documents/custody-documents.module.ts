import { Module } from '@nestjs/common';
import { CompoundsModule } from '../compounds/compounds.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { SamplesModule } from '../samples/samples.module';
import { CUSTODY_DOCUMENT_REPOSITORY } from './domain/custody-document.repository';
import { PrismaCustodyDocumentRepository } from './infrastructure/prisma-custody-document.repository';
import { CustodyDocumentsController } from './infrastructure/custody-documents.controller';
import { ListCustodyDocumentsUseCase } from './application/use-cases/list-custody-documents.use-case';
import { UploadCustodyDocumentUseCase } from './application/use-cases/upload-custody-document.use-case';
import { DeleteCustodyDocumentUseCase } from './application/use-cases/delete-custody-document.use-case';
import { DownloadCustodyDocumentUseCase } from './application/use-cases/download-custody-document.use-case';
import { SyncCustodyDocumentsFromDiskUseCase } from './application/use-cases/sync-custody-documents-from-disk.use-case';
import { DedupeCustodyDocumentsUseCase } from './application/use-cases/dedupe-custody-documents.use-case';

@Module({
  imports: [CompoundsModule, AttachmentsModule, SamplesModule],
  controllers: [CustodyDocumentsController],
  providers: [
    { provide: CUSTODY_DOCUMENT_REPOSITORY, useClass: PrismaCustodyDocumentRepository },
    ListCustodyDocumentsUseCase,
    UploadCustodyDocumentUseCase,
    DeleteCustodyDocumentUseCase,
    DownloadCustodyDocumentUseCase,
    SyncCustodyDocumentsFromDiskUseCase,
    DedupeCustodyDocumentsUseCase,
  ],
  exports: [CUSTODY_DOCUMENT_REPOSITORY],
})
export class CustodyDocumentsModule {}
