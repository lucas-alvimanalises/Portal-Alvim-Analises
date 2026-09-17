import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { FieldChecklistsController } from './field-checklists.controller';
import { FieldChecklistsService } from './field-checklists.service';
import { ChecklistCatalogService } from './checklist-catalog.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [FieldChecklistsController],
  providers: [FieldChecklistsService, ChecklistCatalogService],
})
export class FieldChecklistsModule {}
