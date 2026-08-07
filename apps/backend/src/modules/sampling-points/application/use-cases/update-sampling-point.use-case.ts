import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSamplingPointDto } from '../dto/update-sampling-point.dto';
import {
  SAMPLING_POINT_REPOSITORY,
  SamplingPointRepository,
} from '../../domain/sampling-point.repository';

@Injectable()
export class UpdateSamplingPointUseCase {
  constructor(
    @Inject(SAMPLING_POINT_REPOSITORY)
    private readonly samplingPointRepository: SamplingPointRepository,
  ) {}

  async execute(id: string, dto: UpdateSamplingPointDto) {
    const existing = await this.samplingPointRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Ponto de amostragem não encontrado.');
    }
    return this.samplingPointRepository.update(id, dto);
  }
}
