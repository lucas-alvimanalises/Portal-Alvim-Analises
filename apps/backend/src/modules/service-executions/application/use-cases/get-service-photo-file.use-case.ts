import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';

@Injectable()
export class GetServicePhotoFileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(photoId: string, user: AuthenticatedUser) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: photoId },
      select: {
        filename: true,
        mimeType: true,
        storageKey: true,
        serviceExecution: { select: { schedule: { select: { clientId: true } } } },
      },
    });
    if (!attachment) {
      throw new NotFoundException('Foto não encontrada.');
    }
    assertOwnership(user, { clientId: attachment.serviceExecution?.schedule.clientId });

    const stream = await this.fileStorageService.getStream(attachment.storageKey);
    return { stream, filename: attachment.filename, mimeType: attachment.mimeType };
  }
}
