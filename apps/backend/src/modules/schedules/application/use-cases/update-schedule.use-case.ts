import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';
import { PlantMaintenancesService } from '../../../plant-maintenances/plant-maintenances.service';
import { NotificationsService } from '../../../notifications/notifications.service';

@Injectable()
export class UpdateScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    private readonly plantMaintenancesService: PlantMaintenancesService,
    private readonly notificationsService: NotificationsService,
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

    // Só quem foi ADICIONADO nesta edição (não os que já estavam) — pra não
    // notificar de novo alguém a cada ajuste não relacionado (ex.: mudar
    // comentário, trocar composto). Comparado antes de salvar, contra a
    // lista anterior.
    const previousTechnicianIds = new Set((existing.technicians ?? []).map((t) => t.technician.id));
    const newlyAddedTechnicianIds = (dto.technicianIds ?? []).filter(
      (technicianId) => !previousTechnicianIds.has(technicianId),
    );

    const { overrideMaintenanceWarning: _override, ...scheduleData } = dto;
    const schedule = await this.scheduleRepository.update(id, {
      ...scheduleData,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    for (const technicianId of newlyAddedTechnicianIds) {
      this.notifyAssignment(schedule, technicianId);
    }

    return schedule;
  }

  private notifyAssignment(
    schedule: Awaited<ReturnType<ScheduleRepository['update']>>,
    technicianId: string,
  ) {
    const clientName = schedule.client?.companyName ?? 'Cliente';
    const serviceTypeName = schedule.serviceType?.name ?? 'Serviço';
    const dateLabel = schedule.dateConfirmed
      ? schedule.scheduledDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      : schedule.scheduledDate.toLocaleDateString('pt-BR', {
          timeZone: 'UTC',
          month: 'long',
          year: 'numeric',
        });
    // Melhor esforço: uma falha ao gravar a notificação nunca deve derrubar
    // a criação/edição do agendamento em si.
    this.notificationsService
      .notify(
        technicianId,
        'SCHEDULE_ASSIGNED',
        `Você foi alocado no serviço ${clientName} — ${serviceTypeName} (${dateLabel}).`,
        `/servicos/${schedule.id}`,
      )
      .catch(() => {});
  }
}
