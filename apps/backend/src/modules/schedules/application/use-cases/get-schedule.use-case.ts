import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';

@Injectable()
export class GetScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, {
      clientId: schedule.clientId,
      technicianIds: schedule.technicians?.map((t) => t.technician.id) ?? [],
    });
    return schedule;
  }
}
