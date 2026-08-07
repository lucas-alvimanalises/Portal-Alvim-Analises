import { Inject, Injectable } from '@nestjs/common';
import {
  SAMPLING_POINT_REPOSITORY,
  SamplingPointRepository,
} from '../../domain/sampling-point.repository';

@Injectable()
export class ListSamplingPointsUseCase {
  constructor(
    @Inject(SAMPLING_POINT_REPOSITORY)
    private readonly samplingPointRepository: SamplingPointRepository,
  ) {}

  execute(clientId: string) {
    return this.samplingPointRepository.findManyByClient(clientId);
  }
}
