import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ReplaceSampleResultRowsDto } from '../dto/replace-sample-result-rows.dto';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

@Injectable()
export class ReplaceSampleResultRowsUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  async execute(sampleId: string, dto: ReplaceSampleResultRowsDto) {
    const existing = await this.sampleRepository.findById(sampleId);
    if (!existing) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    return this.sampleRepository.replaceResultRows(sampleId, dto.rows);
  }
}
