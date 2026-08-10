import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateSampleDto } from '../application/dto/create-sample.dto';
import { UpdateSampleDto } from '../application/dto/update-sample.dto';
import { ReplaceSampleResultRowsDto } from '../application/dto/replace-sample-result-rows.dto';
import { CreateSampleUseCase } from '../application/use-cases/create-sample.use-case';
import { ListSamplesUseCase } from '../application/use-cases/list-samples.use-case';
import { GetSampleUseCase } from '../application/use-cases/get-sample.use-case';
import { UpdateSampleUseCase } from '../application/use-cases/update-sample.use-case';
import { DeactivateSampleUseCase } from '../application/use-cases/deactivate-sample.use-case';
import { ReplaceSampleResultRowsUseCase } from '../application/use-cases/replace-sample-result-rows.use-case';
import { ListPendingCertificatesUseCase } from '../application/use-cases/list-pending-certificates.use-case';
import { toSampleDto } from '../application/sample.mapper';

@Controller('samples')
@UseGuards(RolesGuard)
export class SamplesController {
  constructor(
    private readonly createSampleUseCase: CreateSampleUseCase,
    private readonly listSamplesUseCase: ListSamplesUseCase,
    private readonly getSampleUseCase: GetSampleUseCase,
    private readonly updateSampleUseCase: UpdateSampleUseCase,
    private readonly deactivateSampleUseCase: DeactivateSampleUseCase,
    private readonly replaceSampleResultRowsUseCase: ReplaceSampleResultRowsUseCase,
    private readonly listPendingCertificatesUseCase: ListPendingCertificatesUseCase,
  ) {}

  // Antes de ':id' de propósito (senão "pending-certificates" seria lido
  // como um id de amostra).
  @Get('pending-certificates')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  listPendingCertificates() {
    return this.listPendingCertificatesUseCase.execute();
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clientId') clientId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('compoundId') compoundId?: string,
    @Query('samplingPointId') samplingPointId?: string,
  ) {
    const samples = await this.listSamplesUseCase.execute(
      user,
      clientId,
      scheduleId,
      compoundId,
      samplingPointId,
    );
    return samples.map(toSampleDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const sample = await this.getSampleUseCase.execute(id, user);
    return toSampleDto(sample);
  }

  // Criar/editar/excluir amostra é o passo inicial do trabalho de campo do
  // Técnico (registrar a coleta pra depois anexar a cadeia de custódia via
  // custody-extractions, que já é liberado pra ele) — sem isso ele nem
  // conseguia começar. Lançar resultado final (@Put ':id/results' abaixo)
  // continua ADMIN/MANAGER só, por enquanto (trabalho de laboratório/QA,
  // não de campo — revisar se o usuário quiser estender também).
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async create(@Body() dto: CreateSampleDto) {
    const sample = await this.createSampleUseCase.execute(dto);
    return toSampleDto(sample);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async update(@Param('id') id: string, @Body() dto: UpdateSampleDto) {
    const sample = await this.updateSampleUseCase.execute(id, dto);
    return toSampleDto(sample);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async remove(@Param('id') id: string) {
    const sample = await this.deactivateSampleUseCase.execute(id);
    return toSampleDto(sample);
  }

  @Put(':id/results')
  @Roles(Role.ADMIN, Role.MANAGER)
  async replaceResults(@Param('id') id: string, @Body() dto: ReplaceSampleResultRowsDto) {
    const sample = await this.replaceSampleResultRowsUseCase.execute(id, dto);
    return toSampleDto(sample);
  }
}
