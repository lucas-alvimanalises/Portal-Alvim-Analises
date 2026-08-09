import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthenticatedUser, MaintenanceStatus, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlantMaintenancesService } from './plant-maintenances.service';
import { CreatePlantMaintenanceDto } from './dto/create-plant-maintenance.dto';
import { UpdatePlantMaintenanceDto } from './dto/update-plant-maintenance.dto';

// Técnico teve o menu "Manutenção da Planta" removido (pedido do usuário) —
// mas o Dashboard (contagens) e o Histórico (marcadores no gráfico) ainda
// usam findByClient/checkConflicts por baixo dos panos, então essas duas
// rotas de leitura mantêm @Roles próprio incluindo TECHNICIAN. As rotas de
// gestão da tela dedicada (detalhe, criar/editar/excluir, anexos) ficam só
// com o default de classe (sem TECHNICIAN).
@Controller('plant-maintenances')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.CLIENT)
export class PlantMaintenancesController {
  constructor(private readonly plantMaintenancesService: PlantMaintenancesService) {}

  // Rota estática, registrada antes de ":id" só por organização (profundidade
  // de rota diferente, sem ambiguidade real) — usada pelo ScheduleForm antes
  // de submeter um agendamento.
  @Get('conflicts')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  checkConflicts(
    @Query('clientId') clientId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.plantMaintenancesService.checkConflicts(clientId, startDate, endDate);
  }

  @Get('attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.plantMaintenancesService.downloadAttachment(
      attachmentId,
      user,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Delete('attachments/:attachmentId')
  removeAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantMaintenancesService.removeAttachment(attachmentId, user);
  }

  // Usada pelo Dashboard (contagens) e pelo Histórico (marcadores no
  // gráfico), não só pela tela dedicada — por isso mantém TECHNICIAN mesmo
  // com o menu "Manutenção da Planta" removido pra esse papel.
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  findByClient(
    @Query('clientId') clientId: string,
    @Query('year') year: string | undefined,
    @Query('month') month: string | undefined,
    @Query('type') type: string | undefined,
    @Query('status') status: MaintenanceStatus | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantMaintenancesService.findByClient(
      clientId,
      {
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        type,
        status,
      },
      user,
    );
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.plantMaintenancesService.get(id, user);
  }

  @Post()
  create(@Body() dto: CreatePlantMaintenanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.plantMaintenancesService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlantMaintenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantMaintenancesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.plantMaintenancesService.remove(id, user);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plantMaintenancesService.uploadAttachment(id, file, user);
  }
}
