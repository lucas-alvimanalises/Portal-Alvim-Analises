import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CERTIFICATE_REPOSITORY,
  CertificateRepository,
} from '../../../certificates/domain/certificate.repository';
import {
  CERTIFICATE_EXTRACTION_REPOSITORY,
  CertificateExtractionRepository,
} from '../../domain/certificate-extraction.repository';

// Permite refazer uma leitura feita errada: apaga a extração e, se ela já
// tinha sido aprovada (Certificate criado), apaga também o Certificate
// correspondente (e seu arquivo) — mesmo padrão de
// DeleteCustodyExtractionUseCase. Não apaga o escaneado original
// (originalScanFile) mesmo quando a extração nunca foi aprovada — mesma
// lacuna pré-existente do fluxo de cadeia de custódia, mantida por
// consistência.
@Injectable()
export class DeleteCertificateExtractionUseCase {
  constructor(
    @Inject(CERTIFICATE_EXTRACTION_REPOSITORY)
    private readonly certificateExtractionRepository: CertificateExtractionRepository,
    @Inject(CERTIFICATE_REPOSITORY)
    private readonly certificateRepository: CertificateRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.certificateExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    assertOwnership(user, { clientId: extraction.sample.clientId });

    const generatedCertificateId = extraction.generatedCertificate?.id;

    // Apaga a extração primeiro — ela é quem referencia o certificado (FK),
    // então precisa sumir antes de apagar o certificado em si.
    await this.certificateExtractionRepository.delete(id);

    if (generatedCertificateId) {
      const { storageKey } = await this.certificateRepository.delete(generatedCertificateId);
      await this.fileStorageService.delete(storageKey);
    }
  }
}
