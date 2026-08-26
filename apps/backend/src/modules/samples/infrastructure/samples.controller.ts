import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
import { ExportSamplesExcelUseCase } from '../application/use-cases/export-samples-excel.use-case';
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
    private readonly exportSamplesExcelUseCase: ExportSamplesExcelUseCase,
  ) {}

  // Antes de ':id' de propósito (senão "pending-certificates"/"export"
  // seriam lidos como um id de amostra).
  @Get('pending-certificates')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  listPendingCertificates() {
    return this.listPendingCertificatesUseCase.execute();
  }

  // Exportação em Excel do Histórico — sob demanda, liberado pra todo mundo
  // que já acessa GET /samples hoje (inclusive CLIENT, só da própria
  // empresa, ver assertOwnership dentro do use-case). samplingPointIds/
  // compoundIds vêm como lista separada por vírgula (evita configurar
  // parsing de array de query string no Nest pra um caso só).
  @Get('export')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async exportExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
    @Query('clientId') clientId: string,
    @Query('samplingPointIds') samplingPointIds?: string,
    @Query('compoundIds') compoundIds?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { buffer, filename } = await this.exportSamplesExcelUseCase.execute(user, {
      clientId,
      samplingPointIds: samplingPointIds?.split(',').filter(Boolean),
      compoundIds: compoundIds?.split(',').filter(Boolean),
      startDate,
      endDate,
    });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    res.send(buffer);
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
  // custody-extractions, que já era liberado pra ele) — sem isso ele nem
  // conseguia começar. Lançar resultado final (@Put ':id/results' abaixo)
  // também foi liberado (pedido do usuário, Opção A).
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

  // Liberado pro Técnico a pedido do usuário (Opção A) — antes só
  // ADMIN/MANAGER lançavam o resultado final.
  @Put(':id/results')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async replaceResults(@Param('id') id: string, @Body() dto: ReplaceSampleResultRowsDto) {
    const sample = await this.replaceSampleResultRowsUseCase.execute(id, dto);
    return toSampleDto(sample);
  }
}
