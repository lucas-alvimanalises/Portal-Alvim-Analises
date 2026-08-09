import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServiceResultsSummaryService } from './service-results-summary.service';
import { GenerateServiceResultsSummaryDto } from './dto/generate-service-results-summary.dto';

// Ferramenta interna Alvim (nesta primeira etapa o envio ao cliente é
// manual, por fora do portal — ver spec) — sem acesso nenhum de CLIENT ou
// TECHNICIAN, diferente de Relatório de Campo/Reporte ANP que têm uma perna
// voltada ao cliente.
@Controller('service-results-summary')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class ServiceResultsSummaryController {
  constructor(private readonly service: ServiceResultsSummaryService) {}

  // Rota estática antes das rotas com :scheduleId — alimenta o indicador da
  // tabela de Realizados (ver ScheduleListView no frontend).
  @Get('latest')
  getLatestByScheduleIds(@Query('scheduleIds') scheduleIds?: string) {
    const ids = scheduleIds ? scheduleIds.split(',').filter(Boolean) : [];
    return this.service.getLatestByScheduleIds(ids);
  }

  @Get(':scheduleId/preview')
  getPreview(@Param('scheduleId') scheduleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getPreview(scheduleId, user);
  }

  @Get(':scheduleId/versions')
  listVersions(@Param('scheduleId') scheduleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listVersions(scheduleId, user);
  }

  @Post(':scheduleId/generate')
  generate(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: GenerateServiceResultsSummaryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.generate(scheduleId, dto, user);
  }

  @Get('reports/:id/file')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.service.downloadFile(id, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }
}
