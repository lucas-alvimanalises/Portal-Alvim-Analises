import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  SERVICE_EXECUTION_REPOSITORY,
  ServiceExecutionRepository,
} from '../../domain/service-execution.repository';

@Injectable()
export class DeleteServicePhotoUseCase {
  constructor(
    @Inject(SERVICE_EXECUTION_REPOSITORY)
    private readonly serviceExecutionRepository: ServiceExecutionRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(photoId: string, user: AuthenticatedUser) {
    const clientId = await this.serviceExecutionRepository.findPhotoOwnerClientId(photoId);
    if (clientId === null) {
      throw new NotFoundException('Foto não encontrada.');
    }
    assertOwnership(user, { clientId });

    const { storageKey } = await this.serviceExecutionRepository.deletePhoto(photoId);
    await this.fileStorageService.delete(storageKey);
  }
}
