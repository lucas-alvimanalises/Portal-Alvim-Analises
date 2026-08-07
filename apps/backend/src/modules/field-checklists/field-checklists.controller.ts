import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FieldChecklistsService } from './field-checklists.service';
import { SaveFieldChecklistDto } from './dto/save-field-checklist.dto';

// Acesso igual "Organizar Serviço" — ADMIN/Gestor/Técnico, Cliente não
// participa da coleta em campo.
@Controller('field-checklists')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class FieldChecklistsController {
  constructor(private readonly fieldChecklistsService: FieldChecklistsService) {}

  @Get(':scheduleId')
  get(@Param('scheduleId') scheduleId: string) {
    return this.fieldChecklistsService.get(scheduleId);
  }

  @Put(':scheduleId')
  save(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: SaveFieldChecklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldChecklistsService.save(scheduleId, dto.quantities, user.id);
  }
}
