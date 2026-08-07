import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthenticatedUser,
  Role,
  ScheduleStatus,
  TECHNICIAN_ALLOWED_TRANSITIONS,
} from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';

@Injectable()
export class UpdateScheduleStatusUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async execute(id: string, status: ScheduleStatus, user: AuthenticatedUser) {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, {
      technicianIds: schedule.technicians?.map((t) => t.technician.id) ?? [],
    });

    // Técnico só pode seguir as transições de status permitidas na sequência
    // do fluxo de execução; ADMIN/MANAGER podem definir qualquer status
    // (ex.: cancelamento administrativo).
    if (user.role === Role.TECHNICIAN) {
      const allowed = TECHNICIAN_ALLOWED_TRANSITIONS[schedule.status as ScheduleStatus];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Transição de ${schedule.status} para ${status} não é permitida para o técnico.`,
        );
      }
    }

    return this.scheduleRepository.updateStatus(id, status);
  }
}
