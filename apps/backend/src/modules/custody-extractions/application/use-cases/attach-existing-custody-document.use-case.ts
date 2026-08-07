import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import { SampleCompletionService } from '../../../samples/application/sample-completion.service';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../../custody-documents/domain/custody-document.repository';
import { CustodyFieldTemplatesService } from '../../infrastructure/custody-field-templates.service';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';
import { assertNoActiveCustodyExtraction } from '../assert-no-active-custody-extraction.util';

// Caminho pra quando a cadeia de custódia já foi feita fora da plataforma
// (backlog de serviços antigos) — o arquivo anexado vira direto o
// CustodyDocument oficial da amostra, sem gerar um PDF novo nem passar por
// leitura de IA/digitação manual. Ainda assim cria uma CustodyExtraction já
// em APPROVED (sem escaneado, generatedDocumentId apontando pro documento
// recém-criado) — é o único jeito de o "Aguardando Informações" do
// agendamento reconhecer que a cadeia de custódia dessa amostra está
// resolvida (ver ScheduleDerivedStatusService, que só olha
// CustodyExtraction.status).
@Injectable()
export class AttachExistingCustodyDocumentUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    private readonly custodyFieldTemplatesService: CustodyFieldTemplatesService,
    private readonly sampleCompletionService: SampleCompletionService,
  ) {}

  async execute(sampleId: string, file: Express.Multer.File, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

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

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const document = await this.custodyDocumentRepository.create(
      {
        compoundId: sample.compoundId,
        year: sample.collectionDate.getUTCFullYear(),
        uploadedById: user.id,
        sampleId: sample.id,
      },
      {
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );

    const extraction = await this.custodyExtractionRepository.createManual({
      sampleId,
      templateId: template.id,
    });

    const approved = await this.custodyExtractionRepository.approve(extraction.id, {
      approvedById: user.id,
      generatedDocumentId: document.id,
    });

    await this.sampleCompletionService.maybeComplete(sampleId);

    return approved;
  }
}
