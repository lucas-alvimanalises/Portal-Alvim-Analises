import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { applyOwnershipScope, assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../../../schedules/domain/schedule.repository';

@Injectable()
export class ListSamplesUseCase {
  constructor(
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
  ) {}

  async execute(
    user: AuthenticatedUser,
    requestedClientId?: string,
    scheduleId?: string,
    compoundId?: string,
    samplingPointId?: string,
  ) {
    // Amostras excluídas (active: false) nunca aparecem em nenhuma listagem —
    // não existe tela de "lixeira"/restaurar ainda, então esconder é o
    // suficiente pra "apagar" na prática do usuário (ver DeactivateSampleUseCase).
    const baseWhere: Record<string, unknown> = { active: true };
    if (scheduleId) baseWhere.scheduleId = scheduleId;
    if (compoundId) baseWhere.compoundId = compoundId;
    if (samplingPointId) baseWhere.samplingPointId = samplingPointId;

    // scheduleId já identifica uma empresa específica sozinho (o agendamento
    // pertence a exatamente uma) — resolver por aí em vez de cair no default
    // de applyOwnershipScope (user.clientIds[0], "a primeira empresa do
    // usuário") evita mostrar "nenhuma análise iniciada" pra um CLIENT com
    // 2+ empresas vendo o agendamento de uma empresa que não seja a
    // primeira da lista. Achado real: a tela de Resultados Analíticos (que
    // busca só por scheduleId, sem passar clientId) alternava entre mostrar
    // e sumir os dados a cada refresh — porque clientIds[0] no token varia
    // conforme a ORDEM não determinística de clientUser.findMany (sem
    // orderBy, ver login.use-case.ts/refresh-token.use-case.ts), então às
    // vezes calhava de bater com a empresa certa, às vezes não.
    if (scheduleId && user.role === Role.CLIENT && !requestedClientId) {
      const schedule = await this.scheduleRepository.findById(scheduleId);
      if (schedule) {
        assertOwnership(user, { clientId: schedule.clientId });
        baseWhere.clientId = schedule.clientId;
        return this.sampleRepository.findMany(baseWhere);
      }
    }

    const where = applyOwnershipScope(baseWhere, user, { requestedClientId });
    return this.sampleRepository.findMany(where);
  }
}
