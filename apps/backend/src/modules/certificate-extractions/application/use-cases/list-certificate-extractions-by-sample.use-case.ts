import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  CERTIFICATE_EXTRACTION_REPOSITORY,
  CertificateExtractionRepository,
} from '../../domain/certificate-extraction.repository';

@Injectable()
export class ListCertificateExtractionsBySampleUseCase {
  constructor(
    @Inject(CERTIFICATE_EXTRACTION_REPOSITORY)
    private readonly certificateExtractionRepository: CertificateExtractionRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
  ) {}

  async execute(sampleId: string, user: AuthenticatedUser) {
    const sample = await this.sampleRepository.findById(sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    return this.certificateExtractionRepository.findManyBySampleId(sampleId);
  }
}
