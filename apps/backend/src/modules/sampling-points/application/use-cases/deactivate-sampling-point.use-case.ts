import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SAMPLING_POINT_REPOSITORY,
  SamplingPointRepository,
} from '../../domain/sampling-point.repository';

@Injectable()
export class DeactivateSamplingPointUseCase {
  constructor(
    @Inject(SAMPLING_POINT_REPOSITORY)
    private readonly samplingPointRepository: SamplingPointRepository,
  ) {}

  async execute(id: string) {
    const existing = await this.samplingPointRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Ponto de amostragem não encontrado.');
    }
    return this.samplingPointRepository.deactivate(id);
  }
}
