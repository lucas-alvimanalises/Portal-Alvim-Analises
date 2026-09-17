import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { SharedDocumentsController } from './shared-documents.controller';
import { SharedDocumentsService } from './shared-documents.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [SharedDocumentsController],
  providers: [SharedDocumentsService],
})
export class SharedDocumentsModule {}
