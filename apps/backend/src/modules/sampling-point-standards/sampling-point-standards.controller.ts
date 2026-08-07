import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SamplingPointStandardsService } from './sampling-point-standards.service';
import {
  CreateSamplingPointStandardDto,
  UpdateSamplingPointStandardDto,
} from './dto/upsert-sampling-point-standard.dto';

@Controller('sampling-point-standards')
@UseGuards(RolesGuard)
export class SamplingPointStandardsController {
  constructor(private readonly samplingPointStandardsService: SamplingPointStandardsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll() {
    return this.samplingPointStandardsService.findMany();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSamplingPointStandardDto) {
    return this.samplingPointStandardsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSamplingPointStandardDto) {
    return this.samplingPointStandardsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.samplingPointStandardsService.remove(id);
  }
}
