import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { applyOwnershipScope } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

@Injectable()
export class ListSamplesUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  execute(
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
    const where = applyOwnershipScope(baseWhere, user, { requestedClientId });
    return this.sampleRepository.findMany(where);
  }
}
