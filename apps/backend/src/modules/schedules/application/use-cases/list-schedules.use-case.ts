import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { applyOwnershipScope } from '../../../../common/utils/scope.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';

@Injectable()
export class ListSchedulesUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  execute(user: AuthenticatedUser, requestedClientId?: string) {
    const where = applyOwnershipScope({}, user, {
      technicianRelationField: 'technicians',
      requestedClientId,
    });
    return this.scheduleRepository.findMany(where);
  }
}
