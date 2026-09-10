import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { FieldChecklistsController } from './field-checklists.controller';
import { FieldChecklistsService } from './field-checklists.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [FieldChecklistsController],
  providers: [FieldChecklistsService],
})
export class FieldChecklistsModule {}
