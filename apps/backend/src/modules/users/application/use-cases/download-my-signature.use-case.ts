import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class DownloadMySignatureUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user?.signature) {
      throw new NotFoundException('Assinatura não cadastrada.');
    }

    const stream = await this.fileStorageService.getStream(user.signature.storageKey);
    return {
      stream,
      filename: user.signature.filename,
      mimeType: user.signature.mimeType,
    };
  }
}
