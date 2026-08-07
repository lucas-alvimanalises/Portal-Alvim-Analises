import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CalendarNotesService } from './calendar-notes.service';
import { CreateCalendarNoteDto, UpdateCalendarNoteDto } from './dto/upsert-calendar-note.dto';

// Mesmo acesso do calendário da Agenda em si (ver NAV_ITEMS no frontend) —
// Técnico também visualiza/edita notas agora (confirmado com o usuário:
// acesso a todo o menu menos Usuários e Contratos); Cliente continua sem
// acesso a essa tela.
@Controller('calendar-notes')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class CalendarNotesController {
  constructor(private readonly calendarNotesService: CalendarNotesService) {}

  @Get()
  findAll() {
    return this.calendarNotesService.findMany();
  }

  @Post()
  create(@Body() dto: CreateCalendarNoteDto) {
    return this.calendarNotesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCalendarNoteDto) {
    return this.calendarNotesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calendarNotesService.remove(id);
  }
}
