import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocalTipsService } from './local-tips.service';
import { CreateLocalTipDto } from './dto/create-local-tip.dto';
import { UpdateLocalTipDto } from './dto/update-local-tip.dto';

// Mural de dicas locais — uso 100% interno da Alvim. Sem Role.CLIENT em
// nenhuma rota (diferente de PlantMaintenances/AnpMonthlyReports): cliente
// não deve nem saber que esse recurso existe.
@Controller('local-tips')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class LocalTipsController {
  constructor(private readonly localTipsService: LocalTipsService) {}

  // Contagem por empresa — usada pela lista de nível 1 (/dicas-locais) no
  // portal web. Rota estática antes de ":clientId" só por organização.
  @Get('counts')
  countByClient() {
    return this.localTipsService.countByClient();
  }

  @Get(':clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.localTipsService.findByClient(clientId);
  }

  @Post()
  create(@Body() dto: CreateLocalTipDto, @CurrentUser() user: AuthenticatedUser) {
    return this.localTipsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLocalTipDto, @CurrentUser() user: AuthenticatedUser) {
    return this.localTipsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.localTipsService.remove(id, user);
  }
}
