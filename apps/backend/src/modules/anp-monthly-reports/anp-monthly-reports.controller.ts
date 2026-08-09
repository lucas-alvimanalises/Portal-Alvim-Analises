import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnpMonthlyReportsService } from './anp-monthly-reports.service';
import { AnpRegulatoryLimitsService } from './anp-regulatory-limits.service';
import { UpdateAnpRegulatoryLimitsDto } from './dto/update-anp-regulatory-limits.dto';

// Técnico teve o menu "Reportes Mensais ANP" removido (pedido do usuário) —
// não acessa mais nenhuma rota deste controller por padrão. A exceção é
// dashboard-compliance abaixo, que tem @Roles próprio incluindo TECHNICIAN
// (alimenta o bloco "Compliance do mês" do Dashboard, uma tela separada que
// ele continua vendo).
@Controller('anp-monthly-reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.CLIENT)
export class AnpMonthlyReportsController {
  constructor(
    private readonly anpMonthlyReportsService: AnpMonthlyReportsService,
    private readonly anpRegulatoryLimitsService: AnpRegulatoryLimitsService,
  ) {}

  @Get('eligible-clients')
  listEligibleClients(@CurrentUser() user: AuthenticatedUser) {
    return this.anpMonthlyReportsService.listEligibleClients(user);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.anpMonthlyReportsService.getSummary(user);
  }

  // Cross-empresa (não escopado por cliente) — por isso nunca visível a
  // CLIENT, mesmo esta rota estando sob o @Roles de classe mais aberto.
  // Usado pelo bloco "Compliance do mês" do Dashboard.
  @Get('dashboard-compliance')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  getDashboardCompliance() {
    return this.anpMonthlyReportsService.getComplianceOverview();
  }

  @Get('regulatory-limits')
  listRegulatoryLimits() {
    return this.anpRegulatoryLimitsService.list();
  }

  @Patch('regulatory-limits')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateRegulatoryLimits(
    @Body() dto: UpdateAnpRegulatoryLimitsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.anpRegulatoryLimitsService.update(dto.items, user.id);
  }

  @Get('reports/:id/file')
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.anpMonthlyReportsService.downloadFile(id, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  // Excluir uma versão é destrutivo (o arquivo protocolado some) — só Admin,
  // mesmo o Gestor não tem essa permissão ("mediante permissão" do pedido).
  @Delete('reports/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  deleteVersion(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.anpMonthlyReportsService.deleteVersion(id, user);
  }

  @Get(':clientId/months')
  listMonths(@Param('clientId') clientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.anpMonthlyReportsService.listMonths(clientId, user);
  }

  @Get(':clientId/:year/:month')
  getMonthDetail(
    @Param('clientId') clientId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.anpMonthlyReportsService.getMonthDetail(clientId, year, month, user);
  }

  @Post(':clientId/:year/:month/generate')
  @Roles(Role.ADMIN, Role.MANAGER)
  generate(
    @Param('clientId') clientId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.anpMonthlyReportsService.generate(clientId, year, month, user);
  }
}
