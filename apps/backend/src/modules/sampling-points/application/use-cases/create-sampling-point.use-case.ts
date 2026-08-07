import { Inject, Injectable } from '@nestjs/common';
import { CreateSamplingPointDto } from '../dto/create-sampling-point.dto';
import {
  SAMPLING_POINT_REPOSITORY,
  SamplingPointRepository,
} from '../../domain/sampling-point.repository';

@Injectable()
export class CreateSamplingPointUseCase {
  constructor(
    @Inject(SAMPLING_POINT_REPOSITORY)
    private readonly samplingPointRepository: SamplingPointRepository,
  ) {}

  execute(dto: CreateSamplingPointDto) {
    return this.samplingPointRepository.create(dto);
  }
}
