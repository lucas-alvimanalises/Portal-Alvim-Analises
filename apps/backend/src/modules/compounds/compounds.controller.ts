import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompoundsService } from './compounds.service';
import { CreateCompoundDto, UpdateCompoundDto } from './dto/upsert-compound.dto';

@Controller('compounds')
@UseGuards(RolesGuard)
export class CompoundsController {
  constructor(private readonly compoundsService: CompoundsService) {}

  @Get()
  findAll() {
    return this.compoundsService.findMany();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCompoundDto) {
    return this.compoundsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCompoundDto) {
    return this.compoundsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.compoundsService.remove(id);
  }
}
