import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ListSamplingControlParams, Role, SamplingControlSource } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SamplingControlService } from './sampling-control.service';
import { SamplingControlExcelService } from './sampling-control-excel.service';
import { UpdateSamplingControlRecordDto } from './dto/update-sampling-control-record.dto';

// "Tabela de Controle de Amostras" — planilha mestre da Alvim. Uso 100%
// interno (mesmos papéis do menu "Cadeia de Custódia", sem CLIENT).
@Controller('sampling-control')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class SamplingControlController {
  constructor(
    private readonly samplingControlService: SamplingControlService,
    private readonly samplingControlExcelService: SamplingControlExcelService,
  ) {}

  // Rota estática antes de qualquer ":id" (não há GET /:id hoje, mas mantém
  // o padrão dos outros controllers).
  @Get('export')
  async exportExcel(@Res() res: Response, @Query() query: Record<string, string | undefined>) {
    const { buffer, filename } = await this.samplingControlExcelService.export(
      this.parseFilters(query),
    );
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    res.send(buffer);
  }

  @Get()
  list() {
    return this.samplingControlService.list();
  }

  private parseFilters(query: Record<string, string | undefined>): ListSamplingControlParams {
    return {
      startDate: query.startDate,
      endDate: query.endDate,
      source: query.source as SamplingControlSource | undefined,
      clientName: query.clientName,
      compoundName: query.compoundName,
      sampleIdentification: query.sampleIdentification,
      fieldReportNumber: query.fieldReportNumber,
      pump: query.pump,
      samplingPointName: query.samplingPointName,
      observation: query.observation,
      billingResponsible: query.billingResponsible,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSamplingControlRecordDto) {
    return this.samplingControlService.updateRecord(id, {
      billingResponsible: dto.billingResponsible ?? null,
    });
  }
}
