import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ServiceExecutionRepository,
  ServicePhoto,
  UploadedFileData,
} from '../domain/service-execution.repository';

function buildAttachmentData(file: UploadedFileData) {
  return {
    kind: 'PHOTO' as const,
    storageKey: file.storageKey,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedById: file.uploadedById,
  };
}

@Injectable()
export class PrismaServiceExecutionRepository implements ServiceExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.serviceExecution.findUnique({ where: { id } });
  }

  findByScheduleId(scheduleId: string) {
    return this.prisma.serviceExecution.findUnique({ where: { scheduleId } });
  }

  create(data: Prisma.ServiceExecutionUncheckedCreateInput) {
    return this.prisma.serviceExecution.create({ data });
  }

  async listPhotos(serviceExecutionId: string): Promise<ServicePhoto[]> {
    return this.prisma.attachment.findMany({
      where: { serviceExecutionId, kind: 'PHOTO' },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        storageKey: true,
        createdAt: true,
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addPhoto(serviceExecutionId: string, file: UploadedFileData): Promise<ServicePhoto> {
    return this.prisma.attachment.create({
      data: { ...buildAttachmentData(file), serviceExecutionId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        storageKey: true,
        createdAt: true,
        uploadedBy: { select: { name: true } },
      },
    });
  }

  async findPhotoOwnerClientId(photoId: string): Promise<string | null> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: photoId },
      select: { serviceExecution: { select: { schedule: { select: { clientId: true } } } } },
    });
    return attachment?.serviceExecution?.schedule.clientId ?? null;
  }

  async deletePhoto(photoId: string) {
    const existing = await this.prisma.attachment.findUniqueOrThrow({ where: { id: photoId } });
    await this.prisma.attachment.delete({ where: { id: photoId } });
    return { storageKey: existing.storageKey };
  }
}
