import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AnpMonthlyReportsController } from './anp-monthly-reports.controller';
import { AnpMonthlyReportsService } from './anp-monthly-reports.service';
import { AnpRegulatoryLimitsService } from './anp-regulatory-limits.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [AnpMonthlyReportsController],
  providers: [AnpMonthlyReportsService, AnpRegulatoryLimitsService],
})
export class AnpMonthlyReportsModule {}
