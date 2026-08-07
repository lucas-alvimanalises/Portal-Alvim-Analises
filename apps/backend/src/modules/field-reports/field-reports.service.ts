import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, FieldReportDto } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership } from '../../common/utils/scope.util';
import { appendDocumentsToPdf } from '../../common/utils/merge-pdf.util';
import { sanitizeFilename } from '../../common/utils/filename.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository } from '../schedules/domain/schedule.repository';
import { FILE_STORAGE_SERVICE, FileStorageService } from '../attachments/domain/file-storage.interface';
import { ClaudeFieldReportService } from './infrastructure/claude-field-report.service';
import { buildFieldReportPdfBuffer, FieldReportPhoto } from './application/field-report-pdf.util';

const MAX_PHOTOS = 4;

function formatDateUTC(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

@Injectable()
export class FieldReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    private readonly claudeFieldReportService: ClaudeFieldReportService,
  ) {}

  // Mesma lógica de "cadeia de custódia completa" de
  // ScheduleDerivedStatusService.computeMany() (schedules/application/
  // schedule-derived-status.service.ts), só que pra 1 agendamento — não
  // importamos SchedulesModule pra reaproveitar aquele serviço direto (ele
  // já evita ser importado de fora por causa de dependência circular com
  // Samples/CustodyExtractions, ver comentário lá); replicar essa consulta
  // pequena aqui é mais simples que reestruturar módulos.
  private async assertCustodyComplete(scheduleId: string): Promise<void> {
    const samples = await this.prisma.sample.findMany({
      where: { scheduleId, active: true },
      select: { id: true, compoundId: true },
    });

    // Nenhuma amostra lançada ainda — falta informação por definição, igual
    // ScheduleDerivedStatusService (senão um serviço recém-agendado, sem
    // nada preenchido, passaria vazio-por-vacuidade nesta checagem).
    if (samples.length === 0) {
      throw new ConflictException(
        'Ainda não há nenhuma amostra lançada para este serviço — cadastre as análises antes de gerar o relatório de campo.',
      );
    }

    const templates = await this.prisma.custodyFieldTemplate.findMany({
      where: { custodyRequired: true },
      select: { compoundId: true },
    });
    const compoundIdsNeedingCustody = new Set(templates.map((t) => t.compoundId));

    const needingCustody = samples.filter((s) => s.compoundId && compoundIdsNeedingCustody.has(s.compoundId));
    if (needingCustody.length === 0) {
      return;
    }

    const extractions = await this.prisma.custodyExtraction.findMany({
      where: { sampleId: { in: needingCustody.map((s) => s.id) } },
      select: { sampleId: true, status: true },
    });
    const approvedSampleIds = new Set(
      extractions.filter((e) => e.status === 'APPROVED').map((e) => e.sampleId),
    );

    const allDone = needingCustody.every((s) => approvedSampleIds.has(s.id));
    if (!allDone) {
      throw new ConflictException(
        'Ainda há cadeias de custódia pendentes de aprovação neste serviço — cadastre todas antes de gerar o relatório de campo.',
      );
    }
  }

  private async loadPhotos(scheduleId: string, photoIds: string[]): Promise<FieldReportPhoto[]> {
    if (photoIds.length === 0) return [];

    const attachments = await this.prisma.attachment.findMany({
      where: {
        id: { in: photoIds.slice(0, MAX_PHOTOS) },
        kind: 'PHOTO',
        serviceExecution: { scheduleId },
      },
      select: { id: true, storageKey: true, mimeType: true },
    });

    // Mantém a ordem pedida (photoIds), ignora silenciosamente ids que não
    // batem (removidos, de outro serviço, etc.) — não é motivo de erro.
    const byId = new Map(attachments.map((a) => [a.id, a]));
    const ordered = photoIds.map((id) => byId.get(id)).filter((a): a is NonNullable<typeof a> => !!a);

    const photos: FieldReportPhoto[] = [];
    for (const attachment of ordered) {
      const stream = await this.fileStorageService.getStream(attachment.storageKey);
      const buffer = await streamToBuffer(stream);
      photos.push({
        base64: buffer.toString('base64'),
        format: attachment.mimeType === 'image/png' ? 'PNG' : 'JPEG',
      });
    }
    return photos;
  }

  // Todas as cadeias de custódia já aprovadas do serviço (uma por amostra
  // que passou pelo fluxo de digitalização, ver CustodyExtraction.
  // generatedDocumentId) — anexadas em sequência ao final do relatório de
  // campo, pra virar um PDF só (confirmado com o usuário). Cadeia anexada
  // "já pronta" (ver AttachExistingCustodyDocumentUseCase) pode ser imagem
  // em vez de PDF — appendDocumentsToPdf trata os dois casos.
  private async loadCustodyDocuments(scheduleId: string): Promise<{ buffer: Buffer; mimeType: string }[]> {
    const extractions = await this.prisma.custodyExtraction.findMany({
      where: {
        sample: { scheduleId },
        status: 'APPROVED',
        generatedDocumentId: { not: null },
      },
      select: {
        generatedDocument: { select: { file: { select: { storageKey: true, mimeType: true } } } },
      },
      orderBy: { sample: { collectionDate: 'asc' } },
    });

    const documents: { buffer: Buffer; mimeType: string }[] = [];
    for (const extraction of extractions) {
      const file = extraction.generatedDocument?.file;
      if (!file) continue;
      const stream = await this.fileStorageService.getStream(file.storageKey);
      const buffer = await streamToBuffer(stream);
      documents.push({ buffer, mimeType: file.mimeType });
    }
    return documents;
  }

  private toDto(report: {
    id: string;
    scheduleId: string;
    generatedBy: { name: string };
    createdAt: Date;
    updatedAt: Date;
  }): FieldReportDto {
    return {
      id: report.id,
      scheduleId: report.scheduleId,
      generatedByName: report.generatedBy.name,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  // null quando ainda não foi gerado — é esse null que o frontend usa pra
  // decidir se mostra o relatório pro CLIENT (nada aparece antes de existir,
  // confirmado com o usuário).
  async getMetadata(scheduleId: string, user: AuthenticatedUser): Promise<FieldReportDto | null> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, { clientId: schedule.clientId });

    const report = await this.prisma.fieldReport.findUnique({
      where: { scheduleId },
      include: { generatedBy: { select: { name: true } } },
    });
    return report ? this.toDto(report) : null;
  }

  async downloadFile(scheduleId: string, user: AuthenticatedUser) {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, { clientId: schedule.clientId });

    const report = await this.prisma.fieldReport.findUnique({
      where: { scheduleId },
      include: { file: true },
    });
    if (!report) {
      throw new NotFoundException('Ainda não há relatório de campo gerado para este serviço.');
    }

    const stream = await this.fileStorageService.getStream(report.file.storageKey);
    return { stream, filename: report.file.filename, mimeType: report.file.mimeType };
  }

  // Gera e SALVA o PDF (upsert por scheduleId — regenerar substitui o
  // arquivo anterior, sem versionamento: diferente do Reporte ANP, aqui só
  // interessa o relatório mais atual). É essa persistência que faz o
  // relatório "existir" pro cliente depois — antes disso, GET .../:scheduleId
  // simplesmente não acha nada (ver getMetadata acima).
  async generate(scheduleId: string, photoIds: string[], user: AuthenticatedUser): Promise<FieldReportDto> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    assertOwnership(user, { clientId: schedule.clientId });
    await this.assertCustodyComplete(scheduleId);

    const clientName = schedule.client?.companyName ?? 'Empresa';
    const formattedDate =
      schedule.endDate && schedule.endDate.getTime() !== schedule.scheduledDate.getTime()
        ? `${formatDateUTC(schedule.scheduledDate)} a ${formatDateUTC(schedule.endDate)}`
        : formatDateUTC(schedule.scheduledDate);

    const points = (schedule.samplingPoints ?? []).map((p) => ({
      name: p.samplingPoint.name,
      compoundNames: p.compounds.map((c) => c.compound.name),
    }));

    const summaryParagraph = await this.claudeFieldReportService.generateSummary({
      clientName,
      serviceTypeName: schedule.serviceType?.name ?? 'Serviço de campo',
      formattedDate,
      points,
    });

    const introParagraph =
      'De acordo com a RANP 886, o produtor e comercializador do biometano deve monitorar através ' +
      'de amostragens e análises a qualidade do biometano produzido. Os certificados analíticos ' +
      'evidenciam o total atendimento regulatório citado conforme compromisso firmado entre ' +
      'produtor e agência reguladora ANP.';

    const closingParagraph =
      'Após o serviço de campo é realizado o processo de cadastro das informações de campo ' +
      '(cadeia de custódia e registro fotográfico) e posterior envio das amostras para ' +
      `laboratórios parceiros. A Alvim Análises se responsabiliza em receber e validar as ` +
      `informações inseridas nos certificados, para que a ${clientName} possa fazer o reporte da ` +
      'qualidade em atendimento aos requisitos de qualidade estabelecidos pela ANP.';

    const photos = await this.loadPhotos(scheduleId, photoIds);

    const reportBuffer = buildFieldReportPdfBuffer({
      clientName,
      formattedDate,
      introParagraph,
      summaryParagraph,
      closingParagraph,
      photos,
    });

    // Anexa todas as cadeias de custódia já aprovadas do serviço ao final
    // do mesmo PDF (confirmado com o usuário) — sem nenhuma, o relatório
    // sai igual antes, só com o texto/fotos.
    const custodyDocuments = await this.loadCustodyDocuments(scheduleId);
    const buffer =
      custodyDocuments.length > 0
        ? await appendDocumentsToPdf(reportBuffer, custodyDocuments)
        : reportBuffer;

    const safeDate = formattedDate.replace(/\//g, '-').replace(/ a /g, '_a_');
    const filename = `Relatorio de Campo ${safeDate} ${sanitizeFilename(clientName)}.pdf`;

    const upload = await this.fileStorageService.upload({ buffer, filename, mimeType: 'application/pdf' });
    const attachment = await this.prisma.attachment.create({
      data: {
        kind: 'ATTACHMENT_FILE',
        storageKey: upload.storageKey,
        filename,
        mimeType: 'application/pdf',
        sizeBytes: upload.sizeBytes,
        uploadedById: user.id,
      },
    });

    // Regenerar substitui o anterior: apaga a linha antiga (libera fileId,
    // que tem onDelete: Restrict) e o arquivo dela antes de criar a nova —
    // mesma ordem de FieldReportsService/AnpMonthlyReportsService.deleteVersion.
    const existing = await this.prisma.fieldReport.findUnique({
      where: { scheduleId },
      include: { file: true },
    });
    if (existing) {
      await this.prisma.fieldReport.delete({ where: { scheduleId } });
      await this.fileStorageService.delete(existing.file.storageKey);
      await this.prisma.attachment.delete({ where: { id: existing.file.id } });
    }

    const report = await this.prisma.fieldReport.create({
      data: { scheduleId, fileId: attachment.id, generatedById: user.id },
      include: { generatedBy: { select: { name: true } } },
    });

    return this.toDto(report);
  }
}
