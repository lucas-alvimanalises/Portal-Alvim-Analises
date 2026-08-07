import { Module } from '@nestjs/common';
import { SchedulesModule } from '../schedules/schedules.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { FieldReportsController } from './field-reports.controller';
import { FieldReportsService } from './field-reports.service';
import { ClaudeFieldReportService } from './infrastructure/claude-field-report.service';

@Module({
  // Importar SchedulesModule daqui é seguro (direção nova, sem ciclo) — só
  // reaproveita SCHEDULE_REPOSITORY pra buscar cliente/pontos/compostos do
  // agendamento, igual schedule-pdf.util.ts já faz na Ordem de Serviço.
  imports: [SchedulesModule, AttachmentsModule],
  controllers: [FieldReportsController],
  providers: [FieldReportsService, ClaudeFieldReportService],
})
export class FieldReportsModule {}
