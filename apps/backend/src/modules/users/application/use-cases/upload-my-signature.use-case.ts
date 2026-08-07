import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class UploadMySignatureUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    return this.userRepository.updateSignature(userId, {
      storageKey: uploaded.storageKey,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: uploaded.sizeBytes,
      uploadedById: userId,
    });
  }
}
