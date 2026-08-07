import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCustodyDocumentData,
  CustodyDocumentRepository,
  UploadedFileData,
} from '../domain/custody-document.repository';

const INCLUDE_RELATIONS = {
  file: { select: { filename: true, mimeType: true, sizeBytes: true, storageKey: true } },
  compound: { select: { code: true, name: true } },
  uploadedBy: { select: { name: true } },
};

function buildAttachmentData(file: UploadedFileData) {
  return {
    kind: 'CUSTODY_DOCUMENT' as const,
    storageKey: file.storageKey,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedById: file.uploadedById,
  };
}

@Injectable()
export class PrismaCustodyDocumentRepository implements CustodyDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.custodyDocument.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  findMany(compoundId?: string) {
    return this.prisma.custodyDocument.findMany({
      where: compoundId ? { compoundId } : undefined,
      include: INCLUDE_RELATIONS,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(data: CreateCustodyDocumentData, file: UploadedFileData) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({ data: buildAttachmentData(file) });
      return tx.custodyDocument.create({
        data: { ...data, fileId: attachment.id },
        include: INCLUDE_RELATIONS,
      });
    });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.custodyDocument.findUniqueOrThrow({
        where: { id },
        include: { file: true },
      });
      await tx.custodyDocument.delete({ where: { id } });
      await tx.attachment.delete({ where: { id: existing.fileId } });
      return { storageKey: existing.file.storageKey };
    });
  }
}
