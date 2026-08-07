import { Inject, Injectable } from '@nestjs/common';
import { CreateSampleDto } from '../dto/create-sample.dto';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

@Injectable()
export class CreateSampleUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  execute(dto: CreateSampleDto) {
    return this.sampleRepository.create({
      ...dto,
      collectionDate: new Date(dto.collectionDate),
    });
  }
}
