import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { assertOwnership } from '../../../common/utils/scope.util';
import { CreateSamplingPointDto } from '../application/dto/create-sampling-point.dto';
import { UpdateSamplingPointDto } from '../application/dto/update-sampling-point.dto';
import { CreateSamplingPointUseCase } from '../application/use-cases/create-sampling-point.use-case';
import { ListSamplingPointsUseCase } from '../application/use-cases/list-sampling-points.use-case';
import { UpdateSamplingPointUseCase } from '../application/use-cases/update-sampling-point.use-case';
import { DeactivateSamplingPointUseCase } from '../application/use-cases/deactivate-sampling-point.use-case';
import { toSamplingPointDto } from '../application/sampling-point.mapper';

@Controller('sampling-points')
@UseGuards(RolesGuard)
export class SamplingPointsController {
  constructor(
    private readonly createSamplingPointUseCase: CreateSamplingPointUseCase,
    private readonly listSamplingPointsUseCase: ListSamplingPointsUseCase,
    private readonly updateSamplingPointUseCase: UpdateSamplingPointUseCase,
    private readonly deactivateSamplingPointUseCase: DeactivateSamplingPointUseCase,
  ) {}

  // CLIENT e TECHNICIAN também podem listar — usado pelo Histórico (ver
  // apps/web/app/(portal)/historico) — mas CLIENT só vê os pontos da(s)
  // própria(s) empresa(s) (assertOwnership abaixo). Criar/editar/excluir
  // pontos continua exclusivo de ADMIN/MANAGER.
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    if (!clientId) {
      throw new BadRequestException('Informe ?clientId= para listar os pontos de amostragem.');
    }
    assertOwnership(user, { clientId });
    const points = await this.listSamplingPointsUseCase.execute(clientId);
    return points.map(toSamplingPointDto);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  async create(@Body() dto: CreateSamplingPointDto) {
    const point = await this.createSamplingPointUseCase.execute(dto);
    return toSamplingPointDto(point);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateSamplingPointDto) {
    const point = await this.updateSamplingPointUseCase.execute(id, dto);
    return toSamplingPointDto(point);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async remove(@Param('id') id: string) {
    const point = await this.deactivateSamplingPointUseCase.execute(id);
    return toSamplingPointDto(point);
  }
}
