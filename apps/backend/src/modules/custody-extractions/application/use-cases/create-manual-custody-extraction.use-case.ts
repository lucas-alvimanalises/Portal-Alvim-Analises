import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import { CustodyFieldTemplatesService } from '../../infrastructure/custody-field-templates.service';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';
import { assertNoActiveCustodyExtraction } from '../assert-no-active-custody-extraction.util';

// Caminho alternativo ao upload+IA: técnico preenche os campos direto na
// tela de conferência, sem escaneado nenhum — cria a extração já em
// NEEDS_REVIEW com os campos em branco.
@Injectable()
export class CreateManualCustodyExtractionUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    private readonly custodyFieldTemplatesService: CustodyFieldTemplatesService,
  ) {}

  async execute(sampleId: string, user: AuthenticatedUser) {
    const sample = await this.sampleRepository.findById(sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    if (!sample.compoundId) {
      throw new BadRequestException(
        'Esta amostra não tem composto definido — não é possível identificar o modelo de cadeia de custódia.',
      );
    }

    const template = await this.custodyFieldTemplatesService.findByCompoundId(sample.compoundId);
    if (!template) {
      throw new BadRequestException(
        'Ainda não existe um modelo de cadeia de custódia cadastrado para este composto.',
      );
    }

    const existing = await this.custodyExtractionRepository.findManyBySampleId(sampleId);
    assertNoActiveCustodyExtraction(existing);

    return this.custodyExtractionRepository.createManual({ sampleId, templateId: template.id });
  }
}
