import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../../custody-documents/domain/custody-document.repository';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';

// Permite refazer uma cadeia de custódia preenchida errada: apaga a
// extração e, se ela já tinha sido aprovada (PDF gerado), apaga também o
// CustodyDocument correspondente — some tanto do campo da amostra quanto
// da pasta de cadeias de custódia. Libera o slot pra gerar uma nova (ver
// assertNoActiveCustodyExtraction.util.ts).
@Injectable()
export class DeleteCustodyExtractionUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.custodyExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    const sample = await this.sampleRepository.findById(extraction.sampleId);
    assertOwnership(user, { clientId: sample?.clientId });

    const generatedDocumentId = extraction.generatedDocumentId;

    // Apaga a extração primeiro — ela é quem referencia o documento (FK),
    // então precisa sumir antes de apagar o documento em si.
    await this.custodyExtractionRepository.delete(id);

    if (generatedDocumentId) {
      const { storageKey } = await this.custodyDocumentRepository.delete(generatedDocumentId);
      await this.fileStorageService.delete(storageKey);
    }
  }
}
