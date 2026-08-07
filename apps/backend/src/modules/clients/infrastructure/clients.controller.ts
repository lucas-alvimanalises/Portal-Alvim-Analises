import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateClientDto } from '../application/dto/create-client.dto';
import { UpdateClientDto } from '../application/dto/update-client.dto';
import { CreateClientUseCase } from '../application/use-cases/create-client.use-case';
import { ListClientsUseCase } from '../application/use-cases/list-clients.use-case';
import { GetClientUseCase } from '../application/use-cases/get-client.use-case';
import { GetMyClientUseCase } from '../application/use-cases/get-my-client.use-case';
import { UpdateClientUseCase } from '../application/use-cases/update-client.use-case';
import { DeactivateClientUseCase } from '../application/use-cases/deactivate-client.use-case';

@Controller('clients')
@UseGuards(RolesGuard)
export class ClientsController {
  constructor(
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly listClientsUseCase: ListClientsUseCase,
    private readonly getClientUseCase: GetClientUseCase,
    private readonly getMyClientUseCase: GetMyClientUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
    private readonly deactivateClientUseCase: DeactivateClientUseCase,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.listClientsUseCase.execute(user);
  }

  @Get('me')
  @Roles(Role.CLIENT)
  findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.getMyClientUseCase.execute(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getClientUseCase.execute(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateClientDto) {
    return this.createClientUseCase.execute(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.updateClientUseCase.execute(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.deactivateClientUseCase.execute(id);
  }
}
