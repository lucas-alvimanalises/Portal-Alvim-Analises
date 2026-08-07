import { Module } from '@nestjs/common';
import { FieldChecklistsController } from './field-checklists.controller';
import { FieldChecklistsService } from './field-checklists.service';

@Module({
  controllers: [FieldChecklistsController],
  providers: [FieldChecklistsService],
})
export class FieldChecklistsModule {}
