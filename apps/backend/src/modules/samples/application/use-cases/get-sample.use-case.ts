import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

@Injectable()
export class GetSampleUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  async execute(id: string, user: AuthenticatedUser) {
    const sample = await this.sampleRepository.findById(id);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });
    return sample;
  }
}
