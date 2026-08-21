import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { UpdateScheduleCommentsDto } from '../dto/update-schedule-comments.dto';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../domain/schedule.repository';

@Injectable()
export class UpdateScheduleCommentsUseCase {
  constructor(
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async execute(id: string, dto: UpdateScheduleCommentsDto, user: AuthenticatedUser) {
    const existing = await this.scheduleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, {
      clientId: existing.clientId,
      technicianIds: existing.technicians?.map((t) => t.technician.id) ?? [],
    });

    // Cada lado só edita o próprio campo: o cliente só responde
    // (clientResponse); a equipe Alvim só escreve os comentários dela.
    if (user.role === Role.CLIENT) {
      if (dto.internalComments !== undefined || dto.clientComments !== undefined) {
        throw new ForbiddenException('O cliente só pode editar a própria resposta.');
      }
    } else if (dto.clientResponse !== undefined) {
      throw new ForbiddenException('Este campo só pode ser editado pelo cliente.');
    }

    return this.scheduleRepository.updateComments(id, dto);
  }
}
