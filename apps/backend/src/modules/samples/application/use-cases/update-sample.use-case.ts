import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSampleDto } from '../dto/update-sample.dto';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

@Injectable()
export class UpdateSampleUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  async execute(id: string, dto: UpdateSampleDto) {
    const existing = await this.sampleRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    return this.sampleRepository.update(id, {
      ...dto,
      collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : undefined,
    });
  }
}
