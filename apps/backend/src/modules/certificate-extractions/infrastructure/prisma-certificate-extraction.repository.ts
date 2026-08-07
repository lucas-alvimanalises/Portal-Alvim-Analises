import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ApproveCertificateExtractionData,
  CertificateExtractionRepository,
  CreateCertificateExtractionData,
  UpdateCertificateExtractionResultData,
  UploadedFileData,
} from '../domain/certificate-extraction.repository';
import { CertificateExtractedData } from '@portal-alvim/shared';

const INCLUDE_RELATIONS = {
  originalScanFile: { select: { filename: true, mimeType: true, storageKey: true } },
  template: {
    select: {
      analytes: true,
      resultsMode: true,
      collapsedResultLabel: true,
      compound: { select: { code: true, name: true } },
    },
  },
  sample: { select: { clientId: true } },
  generatedCertificate: { select: { id: true } },
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
export class PrismaCertificateExtractionRepository implements CertificateExtractionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.certificateExtraction.findUnique({ where: { id }, include: INCLUDE_RELATIONS });
  }

  findManyBySampleId(sampleId: string) {
    return this.prisma.certificateExtraction.findMany({
      where: { sampleId },
      include: INCLUDE_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: CreateCertificateExtractionData, file: UploadedFileData) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({ data: buildAttachmentData(file) });
      return tx.certificateExtraction.create({
        data: {
          sampleId: data.sampleId,
          templateId: data.templateId,
          originalScanFileId: attachment.id,
        },
        include: INCLUDE_RELATIONS,
      });
    });
  }

  updateResult(id: string, data: UpdateCertificateExtractionResultData) {
    return this.prisma.certificateExtraction.update({
      where: { id },
      data: {
        status: data.status,
        extractedData: (data.extractedData ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: data.errorMessage,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  updateCorrections(id: string, correctedData: CertificateExtractedData) {
    return this.prisma.certificateExtraction.update({
      where: { id },
      data: { correctedData: correctedData as unknown as Prisma.InputJsonValue },
      include: INCLUDE_RELATIONS,
    });
  }

  approve(id: string, data: ApproveCertificateExtractionData) {
    return this.prisma.certificateExtraction.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: data.approvedById,
        generatedCertificateId: data.generatedCertificateId,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async delete(id: string) {
    await this.prisma.certificateExtraction.delete({ where: { id } });
  }
}
