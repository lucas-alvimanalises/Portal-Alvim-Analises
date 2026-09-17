import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LabelsService } from './labels.service';
import { PrintLabelsDto } from './dto/print-labels.dto';
import { ConfirmServiceLabelsDto } from './dto/confirm-service-labels.dto';

// Acesso igual "Organizar Serviço" — qualquer colaborador da Alvim com o
// portal pode imprimir (ADMIN/Gestor/Técnico), Cliente não participa da
// coleta em campo.
@Controller('labels')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  // Só leitura — abrir/atualizar a tela de impressão nunca reserva número
  // nenhum (ver LabelsService).
  @Get('preview')
  preview(@Query('scheduleId') scheduleId: string, @Query('compoundId') compoundId: string) {
    if (!scheduleId || !compoundId) {
      throw new BadRequestException('Informe scheduleId e compoundId.');
    }
    return this.labelsService.previewLabels(scheduleId, compoundId);
  }

  // Só aqui a sequência é de fato consumida — chamado quando o usuário
  // clica em "Imprimir" na tela, nunca automaticamente.
  @Post('confirm')
  confirm(@Body() dto: PrintLabelsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.labelsService.confirmPrint(dto.scheduleId, dto.compoundId, user.id);
  }

  // Botão "Imprimir Etiquetas Serviço" — todos os grupos de etiqueta do
  // agendamento de uma vez (menos os excluídos, ver VOCS_LABEL_CODE).
  // Preview não grava nada; confirm consome as sequências dos compostos
  // incluídos. `excludeCodes` vem como lista separada por vírgula.
  @Get('service-preview')
  servicePreview(@Query('scheduleId') scheduleId: string, @Query('excludeCodes') excludeCodes?: string) {
    if (!scheduleId) {
      throw new BadRequestException('Informe scheduleId.');
    }
    return this.labelsService.servicePreview(scheduleId, this.parseExcludeCodes(excludeCodes));
  }

  @Post('service-confirm')
  serviceConfirm(@Body() dto: ConfirmServiceLabelsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.labelsService.serviceConfirm(dto.scheduleId, user.id, dto.excludeCodes ?? []);
  }

  private parseExcludeCodes(raw: string | undefined): string[] {
    return raw?.split(',').map((code) => code.trim()).filter(Boolean) ?? [];
  }
}
