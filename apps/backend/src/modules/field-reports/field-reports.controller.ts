import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FieldReportsService } from './field-reports.service';
import { GenerateFieldReportDto } from './dto/generate-field-report.dto';

// Técnico não participa (peça de comunicação Alvim↔cliente, não ferramenta
// de coleta) — mesmo acesso da tela "Serviços Realizados" onde o botão vive.
// CLIENT só enxerga leitura (metadados/arquivo) — gerar é ação exclusiva da
// equipe Alvim, ver @Roles no método generate abaixo.
@Controller('field-reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.CLIENT)
export class FieldReportsController {
  constructor(private readonly fieldReportsService: FieldReportsService) {}

  // Metadados (existe? quem gerou, quando) — null se ainda não foi gerado.
  // É essa resposta que o frontend usa pra decidir se mostra o relatório
  // pro CLIENT (nada aparece antes de existir).
  @Get(':scheduleId')
  getMetadata(@Param('scheduleId') scheduleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.fieldReportsService.getMetadata(scheduleId, user);
  }

  @Get(':scheduleId/file')
  async downloadFile(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.fieldReportsService.downloadFile(scheduleId, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  // Só Admin/Gestor gera (ou regenera, substituindo o PDF anterior) — o
  // cliente só tem acesso de leitura acima (confirmado com o usuário).
  @Post(':scheduleId/generate')
  @Roles(Role.ADMIN, Role.MANAGER)
  generate(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: GenerateFieldReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldReportsService.generate(scheduleId, dto.photoIds ?? [], user);
  }
}
