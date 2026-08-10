import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ApproveCustodyExtractionData,
  CreateCustodyExtractionData,
  CustodyExtractionRepository,
  UpdateCustodyExtractionResultData,
  UploadedFileData,
} from '../domain/custody-extraction.repository';
import { CustodyExtractedData } from '@portal-alvim/shared';

const INCLUDE_RELATIONS = {
  originalScanFile: { select: { filename: true, mimeType: true, storageKey: true } },
  template: {
    select: { fields: true, compound: { select: { code: true, name: true } } },
  },
  sample: { select: { scheduleId: true } },
  selectedPhoto: { select: { filename: true, mimeType: true, storageKey: true } },
  generatedDocument: { select: { file: { select: { filename: true } } } },
};

function buildAttachmentData(file: UploadedFileData) {
  return {
    kind: 'ATTACHMENT_FILE' as const,
    storageKey: file.storageKey,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    uploadedById: file.uploadedById,
  };
}

@Injectable()
export class PrismaCustodyExtractionRepository implements CustodyExtractionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.custodyExtraction.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  findManyBySampleId(sampleId: string) {
    return this.prisma.custodyExtraction.findMany({
      where: { sampleId },
      include: INCLUDE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: CreateCustodyExtractionData, file: UploadedFileData) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({ data: buildAttachmentData(file) });
      return tx.custodyExtraction.create({
        data: {
          sampleId: data.sampleId,
          templateId: data.templateId,
          originalScanFileId: attachment.id,
        },
        include: INCLUDE_RELATIONS,
      });
    });
  }

  createManual(data: CreateCustodyExtractionData, initialFields?: Record<string, unknown>) {
    return this.prisma.custodyExtraction.create({
      data: {
        sampleId: data.sampleId,
        templateId: data.templateId,
        status: 'NEEDS_REVIEW',
        extractedData: { fields: initialFields ?? {}, table: {} } as Prisma.InputJsonValue,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  updateResult(id: string, data: UpdateCustodyExtractionResultData) {
    return this.prisma.custodyExtraction.update({
      where: { id },
      data: {
        status: data.status,
        extractedData: (data.extractedData ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: data.errorMessage,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  updateCorrections(id: string, correctedData: CustodyExtractedData) {
    return this.prisma.custodyExtraction.update({
      where: { id },
      data: { correctedData: correctedData as unknown as Prisma.InputJsonValue },
      include: INCLUDE_RELATIONS,
    });
  }

  updateSelectedPhoto(id: string, photoId: string | null) {
    return this.prisma.custodyExtraction.update({
      where: { id },
      data: { selectedPhotoId: photoId },
      include: INCLUDE_RELATIONS,
    });
  }

  approve(id: string, data: ApproveCustodyExtractionData) {
    return this.prisma.custodyExtraction.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: data.approvedById,
        generatedDocumentId: data.generatedDocumentId,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async delete(id: string) {
    await this.prisma.custodyExtraction.delete({ where: { id } });
  }
}
