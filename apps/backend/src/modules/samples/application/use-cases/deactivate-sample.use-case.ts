import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

@Injectable()
export class DeactivateSampleUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  async execute(id: string) {
    const existing = await this.sampleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    return this.sampleRepository.deactivate(id);
  }
}
