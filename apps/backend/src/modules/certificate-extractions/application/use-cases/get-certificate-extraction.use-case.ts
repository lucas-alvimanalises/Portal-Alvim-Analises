import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import {
  CERTIFICATE_EXTRACTION_REPOSITORY,
  CertificateExtractionRepository,
} from '../../domain/certificate-extraction.repository';

@Injectable()
export class GetCertificateExtractionUseCase {
  constructor(
    @Inject(CERTIFICATE_EXTRACTION_REPOSITORY)
    private readonly certificateExtractionRepository: CertificateExtractionRepository,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.certificateExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    assertOwnership(user, { clientId: extraction.sample.clientId });

    return extraction;
  }
}
