import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';
import { PlantMaintenancesService } from '../../../plant-maintenances/plant-maintenances.service';

@Injectable()
export class CreateScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    private readonly plantMaintenancesService: PlantMaintenancesService,
  ) {}

  async execute(dto: CreateScheduleDto) {
    // Bloqueio de agenda: uma manutenção programada/em andamento na planta
    // nessa mesma data barra o agendamento, a não ser que o usuário já tenha
    // confirmado "Agendar mesmo assim" (ver PlantMaintenancesService.checkConflicts).
    if (!dto.overrideMaintenanceWarning) {
      const conflicts = await this.plantMaintenancesService.checkConflicts(
        dto.clientId,
        dto.scheduledDate,
        dto.endDate,
      );
      if (conflicts.length > 0) {
        throw new ConflictException({
          message: 'Existe uma manutenção programada para esta data.',
          conflicts,
        });
      }
    }

    const { overrideMaintenanceWarning: _override, ...scheduleData } = dto;
    return this.scheduleRepository.create({
      ...scheduleData,
      scheduledDate: new Date(dto.scheduledDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }
}
