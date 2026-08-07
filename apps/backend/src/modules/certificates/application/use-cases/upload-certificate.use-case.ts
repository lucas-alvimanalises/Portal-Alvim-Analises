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
import { CERTIFICATE_REPOSITORY, CertificateRepository } from '../../domain/certificate.repository';
import { CreateCertificateDto } from '../dto/create-certificate.dto';
import { assertNoExistingCertificate } from '../assert-no-existing-certificate.util';

@Injectable()
export class UploadCertificateUseCase {
  constructor(
    @Inject(CERTIFICATE_REPOSITORY) private readonly certificateRepository: CertificateRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    private readonly sampleCompletionService: SampleCompletionService,
  ) {}

  async execute(dto: CreateCertificateDto, file: Express.Multer.File, user: AuthenticatedUser) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const sample = await this.sampleRepository.findById(dto.sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    const existing = await this.certificateRepository.findManyBySampleId(dto.sampleId);
    assertNoExistingCertificate(existing);

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const certificate = await this.certificateRepository.create(
      {
        sampleId: dto.sampleId,
        certificateNumber: dto.certificateNumber,
        laboratory: dto.laboratory,
        analysisDate: new Date(dto.analysisDate),
        issueDate: new Date(dto.issueDate),
        responsibleUserId: dto.responsibleUserId,
      },
      {
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );

    await this.sampleCompletionService.maybeComplete(dto.sampleId);

    return certificate;
  }
}
