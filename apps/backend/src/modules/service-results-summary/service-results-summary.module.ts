import { Module } from '@nestjs/common';
import { SchedulesModule } from '../schedules/schedules.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { ServiceResultsSummaryController } from './service-results-summary.controller';
import { ServiceResultsSummaryService } from './service-results-summary.service';

@Module({
  // Mesma dependência de SchedulesModule (SCHEDULE_REPOSITORY) já usada em
  // FieldReportsModule — direção segura, sem ciclo.
  imports: [SchedulesModule, AttachmentsModule],
  controllers: [ServiceResultsSummaryController],
  providers: [ServiceResultsSummaryService],
})
export class ServiceResultsSummaryModule {}
