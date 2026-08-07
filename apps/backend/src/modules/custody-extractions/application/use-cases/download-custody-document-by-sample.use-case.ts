import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../../custody-documents/domain/custody-document.repository';

// Baixa o PDF de cadeia de custódia já gerado (aprovado) direto pela
// amostra — sem o front precisar descobrir o id da extração/documento antes.
// Usado no download em lote de Resultados/Histórico, inclusive por CLIENT
// (diferente de CustodyDocumentsController, que é sem escopo de cliente e
// por isso fica restrito a ADMIN/MANAGER — aqui o escopo vem da amostra).
@Injectable()
export class DownloadCustodyDocumentBySampleUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(sampleId: string, user: AuthenticatedUser) {
    const sample = await this.sampleRepository.findById(sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    const extractions = await this.custodyExtractionRepository.findManyBySampleId(sampleId);
    const approved = extractions.find(
      (extraction) => extraction.status === 'APPROVED' && extraction.generatedDocumentId,
    );
    if (!approved?.generatedDocumentId) {
      throw new NotFoundException('Cadeia de custódia aprovada não encontrada para esta amostra.');
    }

    const document = await this.custodyDocumentRepository.findById(approved.generatedDocumentId);
    if (!document) {
      throw new NotFoundException('Documento de cadeia de custódia não encontrado.');
    }

    const stream = await this.fileStorageService.getStream(document.file.storageKey);
    return {
      stream,
      filename: document.file.filename,
      mimeType: document.file.mimeType,
    };
  }
}
