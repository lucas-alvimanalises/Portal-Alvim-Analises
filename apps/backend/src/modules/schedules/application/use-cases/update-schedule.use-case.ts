import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';
import { PlantMaintenancesService } from '../../../plant-maintenances/plant-maintenances.service';

@Injectable()
export class UpdateScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    private readonly plantMaintenancesService: PlantMaintenancesService,
  ) {}

  async execute(id: string, dto: UpdateScheduleDto) {
    const existing = await this.scheduleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    // Mesmo bloqueio de agenda do create — vale também pra edição (ex.:
    // arrastar um serviço no Calendário pra uma data com manutenção).
    if (!dto.overrideMaintenanceWarning) {
      const clientId = dto.clientId ?? existing.clientId;
      const scheduledDate = dto.scheduledDate ?? existing.scheduledDate.toISOString();
      const endDate = dto.endDate ?? (existing.endDate ? existing.endDate.toISOString() : undefined);
      const conflicts = await this.plantMaintenancesService.checkConflicts(
        clientId,
        scheduledDate,
        endDate,
      );
      if (conflicts.length > 0) {
        throw new ConflictException({
          message: 'Existe uma manutenção programada para esta data.',
          conflicts,
        });
      }
    }

    const { overrideMaintenanceWarning: _override, ...scheduleData } = dto;
    return this.scheduleRepository.update(id, {
      ...scheduleData,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }
}
