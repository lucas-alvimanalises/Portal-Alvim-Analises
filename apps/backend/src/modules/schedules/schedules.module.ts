import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { PlantMaintenancesModule } from '../plant-maintenances/plant-maintenances.module';
import { SchedulesController } from './infrastructure/schedules.controller';
import { PrismaScheduleRepository } from './infrastructure/prisma-schedule.repository';
import { SCHEDULE_REPOSITORY } from './domain/schedule.repository';
import { CreateScheduleUseCase } from './application/use-cases/create-schedule.use-case';
import { ListSchedulesUseCase } from './application/use-cases/list-schedules.use-case';
import { GetScheduleUseCase } from './application/use-cases/get-schedule.use-case';
import { UpdateScheduleUseCase } from './application/use-cases/update-schedule.use-case';
import { UpdateScheduleCommentsUseCase } from './application/use-cases/update-schedule-comments.use-case';
import { UpdateScheduleStatusUseCase } from './application/use-cases/update-schedule-status.use-case';
import { DeleteScheduleUseCase } from './application/use-cases/delete-schedule.use-case';
import { SendScheduleToClientUseCase } from './application/use-cases/send-schedule-to-client.use-case';
import { ScheduleDerivedStatusService } from './application/schedule-derived-status.service';

@Module({
  imports: [ClientsModule, UsersModule, MailModule, PlantMaintenancesModule],
  controllers: [SchedulesController],
  providers: [
    { provide: SCHEDULE_REPOSITORY, useClass: PrismaScheduleRepository },
    CreateScheduleUseCase,
    ListSchedulesUseCase,
    GetScheduleUseCase,
    UpdateScheduleUseCase,
    UpdateScheduleCommentsUseCase,
    UpdateScheduleStatusUseCase,
    DeleteScheduleUseCase,
    SendScheduleToClientUseCase,
    ScheduleDerivedStatusService,
  ],
  exports: [SCHEDULE_REPOSITORY],
})
export class SchedulesModule {}
