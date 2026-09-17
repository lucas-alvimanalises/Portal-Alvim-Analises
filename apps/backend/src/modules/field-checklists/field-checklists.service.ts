import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FieldChecklistDto } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { fixMultipartFilename } from '../../common/utils/multipart-filename.util';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../attachments/domain/file-storage.interface';
import { buildBlankFieldChecklistPdf } from './field-checklist-pdf.util';
import { ChecklistCatalogService } from './checklist-catalog.service';

const INCLUDE = {
  filledBy: { select: { name: true } },
  attachments: {
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

type ChecklistWithRelations = {
  id: string;
  scheduleId: string;
  quantities: unknown;
  filledById: string;
  filledBy: { name: string };
  filledAt: Date;
  updatedAt: Date;
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: { name: string };
    createdAt: Date;
  }[];
};

// Check list de material de campo (ver ChecklistCatalogService pro catálogo
// de itens, editável pelo portal) — um registro por agendamento, salvar de
// novo sobrescreve. Quem prefere papel imprime o modelo em branco
// (getBlankPdf), preenche à mão e anexa a foto/PDF de volta
// (uploadAttachment) — convive com o preenchimento digital em `quantities`,
// não substitui.
@Injectable()
export class FieldChecklistsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    private readonly checklistCatalogService: ChecklistCatalogService,
  ) {}

  async get(scheduleId: string): Promise<FieldChecklistDto | null> {
    const checklist = await this.prisma.serviceChecklist.findUnique({
      where: { scheduleId },
      include: INCLUDE,
    });
    if (!checklist) return null;
    return this.toDto(checklist);
  }

  async save(
    scheduleId: string,
    quantities: Record<string, number>,
    userId: string,
  ): Promise<FieldChecklistDto> {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    // Só guarda quantidades positivas — 0/negativo/ausente é "não levou".
    const cleaned: Record<string, number> = {};
    Object.entries(quantities).forEach(([key, value]) => {
      if (Number.isFinite(value) && value > 0) cleaned[key] = Math.floor(value);
    });

    const checklist = await this.prisma.serviceChecklist.upsert({
      where: { scheduleId },
      update: { quantities: cleaned, filledById: userId, filledAt: new Date() },
      create: { scheduleId, quantities: cleaned, filledById: userId },
      include: INCLUDE,
    });
    return this.toDto(checklist);
  }

  // PDF do checklist em branco, no modelo Alvim, com cliente/serviço/data do
  // agendamento no cabeçalho.
  async getBlankPdf(scheduleId: string): Promise<{ buffer: Buffer; filename: string }> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { client: { select: { companyName: true } }, serviceType: { select: { name: true } } },
    });
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    const sections = await this.checklistCatalogService.listSections();
    const buffer = buildBlankFieldChecklistPdf(
      {
        clientName: schedule.client.companyName,
        serviceTypeName: schedule.serviceType.name,
        scheduledDate: schedule.scheduledDate.toISOString().slice(0, 10),
      },
      sections,
    );
    return { buffer, filename: 'checklist-campo-em-branco.pdf' };
  }

  // Anexa uma foto/PDF do checklist preenchido no papel. Cria o
  // ServiceChecklist (com quantities vazio) se ainda não existir — anexar o
  // papel não exige ter preenchido nada no digital.
  async uploadAttachment(
    scheduleId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<FieldChecklistDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const checklist = await this.prisma.serviceChecklist.upsert({
      where: { scheduleId },
      update: {},
      create: { scheduleId, quantities: {}, filledById: userId },
      select: { id: true },
    });

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });
    await this.prisma.attachment.create({
      data: {
        kind: 'ATTACHMENT_FILE',
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: userId,
        serviceChecklistId: checklist.id,
      },
    });

    const full = await this.prisma.serviceChecklist.findUniqueOrThrow({
      where: { scheduleId },
      include: INCLUDE,
    });
    return this.toDto(full);
  }

  async downloadAttachment(
    attachmentId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string; mimeType: string }> {
    const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment?.serviceChecklistId) {
      throw new NotFoundException('Anexo não encontrado.');
    }
    const stream = await this.fileStorageService.getStream(attachment.storageKey);
    return { stream, filename: attachment.filename, mimeType: attachment.mimeType };
  }

  async removeAttachment(attachmentId: string): Promise<{ success: true }> {
    const attachment = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment?.serviceChecklistId) {
      throw new NotFoundException('Anexo não encontrado.');
    }
    await this.fileStorageService.delete(attachment.storageKey);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true };
  }

  private toDto(checklist: ChecklistWithRelations): FieldChecklistDto {
    return {
      id: checklist.id,
      scheduleId: checklist.scheduleId,
      quantities: (checklist.quantities as Record<string, number>) ?? {},
      filledById: checklist.filledById,
      filledByName: checklist.filledBy.name,
      filledAt: checklist.filledAt.toISOString(),
      updatedAt: checklist.updatedAt.toISOString(),
      attachments: checklist.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uploadedByName: a.uploadedBy.name,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
