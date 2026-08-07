import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';

@Injectable()
export class DeleteScheduleUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async execute(id: string) {
    const existing = await this.scheduleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    await this.scheduleRepository.delete(id);
  }
}
