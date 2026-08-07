import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CertificateRepository,
  CreateCertificateData,
  UpdateCertificateMetadata,
  UploadedFileData,
} from '../domain/certificate.repository';

const INCLUDE_RELATIONS = {
  file: { select: { filename: true, mimeType: true, sizeBytes: true, storageKey: true } },
  responsibleUser: { select: { name: true } },
  extractionOrigin: {
    select: {
      extractedData: true,
      correctedData: true,
      template: { select: { analytes: true } },
    },
  },
};

function buildAttachmentData(file: UploadedFileData) {
  return {
    kind: 'CERTIFICATE_PDF' as const,
    storageKey: file.storageKey,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedById: file.uploadedById,
  };
}

@Injectable()
export class PrismaCertificateRepository implements CertificateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.certificate.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  findManyBySampleId(sampleId: string) {
    return this.prisma.certificate.findMany({
      where: { sampleId },
      include: INCLUDE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: CreateCertificateData, file: UploadedFileData) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({ data: buildAttachmentData(file) });
      return tx.certificate.create({
        data: { ...data, fileId: attachment.id },
        include: INCLUDE_RELATIONS,
      });
    });
  }

  async replaceFile(id: string, file: UploadedFileData) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.certificate.findUniqueOrThrow({ where: { id }, include: { file: true } });
      const oldFileId = existing.fileId;
      const oldStorageKey = existing.file.storageKey;

      const newAttachment = await tx.attachment.create({ data: buildAttachmentData(file) });
      const nextVersion = String((Number(existing.version) || 0) + 1);

      const certificate = await tx.certificate.update({
        where: { id },
        data: { fileId: newAttachment.id, version: nextVersion },
        include: INCLUDE_RELATIONS,
      });

      // Só apaga a linha do Attachment antigo depois que o certificado já
      // aponta pro novo — evita violar a FK obrigatória de Certificate.fileId.
      await tx.attachment.delete({ where: { id: oldFileId } });

      return { certificate, oldStorageKey };
    });
  }

  updateMetadata(id: string, data: UpdateCertificateMetadata) {
    return this.prisma.certificate.update({ where: { id }, data, include: INCLUDE_RELATIONS });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.certificate.findUniqueOrThrow({ where: { id }, include: { file: true } });
      await tx.certificate.delete({ where: { id } });
      await tx.attachment.delete({ where: { id: existing.fileId } });
      return { storageKey: existing.file.storageKey };
    });
  }
}
