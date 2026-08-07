import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateContractDto } from '../application/dto/create-contract.dto';
import { UpdateContractDto } from '../application/dto/update-contract.dto';
import { AddScopeDto } from '../application/dto/add-scope.dto';
import { CreateContractUseCase } from '../application/use-cases/create-contract.use-case';
import { ListContractsUseCase } from '../application/use-cases/list-contracts.use-case';
import { GetContractUseCase } from '../application/use-cases/get-contract.use-case';
import { UpdateContractUseCase } from '../application/use-cases/update-contract.use-case';
import { DeactivateContractUseCase } from '../application/use-cases/deactivate-contract.use-case';
import { ManageContractScopeUseCase } from '../application/use-cases/manage-contract-scope.use-case';

@Controller('contracts')
@UseGuards(RolesGuard)
export class ContractsController {
  constructor(
    private readonly createContractUseCase: CreateContractUseCase,
    private readonly listContractsUseCase: ListContractsUseCase,
    private readonly getContractUseCase: GetContractUseCase,
    private readonly updateContractUseCase: UpdateContractUseCase,
    private readonly deactivateContractUseCase: DeactivateContractUseCase,
    private readonly manageContractScopeUseCase: ManageContractScopeUseCase,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CLIENT)
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    return this.listContractsUseCase.execute(user, clientId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CLIENT)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getContractUseCase.execute(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateContractDto) {
    return this.createContractUseCase.execute(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.updateContractUseCase.execute(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.deactivateContractUseCase.execute(id);
  }

  @Post(':id/scopes')
  @Roles(Role.ADMIN, Role.MANAGER)
  addScope(@Param('id') id: string, @Body() dto: AddScopeDto) {
    return this.manageContractScopeUseCase.addScope(id, dto.serviceTypeId);
  }

  @Delete(':id/scopes/:serviceTypeId')
  @Roles(Role.ADMIN, Role.MANAGER)
  removeScope(@Param('id') id: string, @Param('serviceTypeId') serviceTypeId: string) {
    return this.manageContractScopeUseCase.removeScope(id, serviceTypeId);
  }
}
