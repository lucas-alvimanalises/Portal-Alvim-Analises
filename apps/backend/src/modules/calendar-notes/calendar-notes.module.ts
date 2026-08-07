import { Module } from '@nestjs/common';
import { CalendarNotesController } from './calendar-notes.controller';
import { CalendarNotesService } from './calendar-notes.service';

@Module({
  controllers: [CalendarNotesController],
  providers: [CalendarNotesService],
})
export class CalendarNotesModule {}
