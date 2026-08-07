import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../../schedules/domain/schedule.repository';
import {
  SERVICE_EXECUTION_REPOSITORY,
  ServiceExecutionRepository,
} from '../../domain/service-execution.repository';

@Injectable()
export class ListServicePhotosUseCase {
  constructor(
    @Inject(SERVICE_EXECUTION_REPOSITORY)
    private readonly serviceExecutionRepository: ServiceExecutionRepository,
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async execute(scheduleId: string, user: AuthenticatedUser) {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, { clientId: schedule.clientId });

    const execution = await this.serviceExecutionRepository.findByScheduleId(scheduleId);
    if (!execution) {
      return [];
    }
    return this.serviceExecutionRepository.listPhotos(execution.id);
  }
}
