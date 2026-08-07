import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { CERTIFICATE_REPOSITORY, CertificateRepository } from '../../domain/certificate.repository';

@Injectable()
export class ReplaceCertificateFileUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(id: string, file: Express.Multer.File, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const existing = await this.certificateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Certificado não encontrado.');
    }
    const sample = await this.sampleRepository.findById(existing.sampleId);
    assertOwnership(user, { clientId: sample?.clientId });

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const { certificate, oldStorageKey } = await this.certificateRepository.replaceFile(id, {
      storageKey: uploaded.storageKey,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: uploaded.sizeBytes,
      uploadedById: user.id,
    });

    // Só apaga o arquivo físico antigo depois que o banco já confirmou a troca.
    await this.fileStorageService.delete(oldStorageKey);

    return certificate;
  }
}
