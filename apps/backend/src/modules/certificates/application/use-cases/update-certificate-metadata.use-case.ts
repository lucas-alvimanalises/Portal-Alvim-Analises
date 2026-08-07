import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import { CERTIFICATE_REPOSITORY, CertificateRepository } from '../../domain/certificate.repository';
import { UpdateCertificateMetadataDto } from '../dto/update-certificate-metadata.dto';

@Injectable()
export class UpdateCertificateMetadataUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
  ) {}

  async execute(id: string, dto: UpdateCertificateMetadataDto, user: AuthenticatedUser) {
    const existing = await this.certificateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Certificado não encontrado.');
    }
    const sample = await this.sampleRepository.findById(existing.sampleId);
    assertOwnership(user, { clientId: sample?.clientId });

    return this.certificateRepository.updateMetadata(id, {
      certificateNumber: dto.certificateNumber,
      laboratory: dto.laboratory,
      analysisDate: dto.analysisDate ? new Date(dto.analysisDate) : undefined,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
      responsibleUserId: dto.responsibleUserId,
      status: dto.status,
    });
  }
}
