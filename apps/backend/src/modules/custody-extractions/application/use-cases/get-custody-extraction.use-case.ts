import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';

@Injectable()
export class GetCustodyExtractionUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.custodyExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    const sample = await this.sampleRepository.findById(extraction.sampleId);
    assertOwnership(user, { clientId: sample?.clientId });

    return extraction;
  }
}
