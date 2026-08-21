import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrackingShipmentsService } from './tracking-shipments.service';
import { CreateTrackingShipmentDto } from './dto/create-tracking-shipment.dto';

// Submenu "Serviços > Código de Rastreio" — ferramenta operacional interna
// (cadastro de envios de amostra pelos Correios), sem acesso de CLIENT.
@Controller('tracking-shipments')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class TrackingShipmentsController {
  constructor(private readonly trackingShipmentsService: TrackingShipmentsService) {}

  @Get()
  findAll() {
    return this.trackingShipmentsService.findMany();
  }

  @Post()
  create(@Body() dto: CreateTrackingShipmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.trackingShipmentsService.create(dto, user);
  }

  @Patch(':id/deliver')
  markDelivered(@Param('id') id: string) {
    return this.trackingShipmentsService.markDelivered(id);
  }

  // Só Admin corrige um cadastro errado (excluindo) — mesmo critério de
  // exclusão restrita já usado em outros módulos operacionais desta sessão.
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.trackingShipmentsService.remove(id);
  }
}
