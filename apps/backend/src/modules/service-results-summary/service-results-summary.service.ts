import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthenticatedUser,
  BarreiraComparisonRow,
  ComplianceStatus,
  GenerateServiceResultsSummaryPayload,
  ServiceResultsSummaryDto,
  ServiceResultsSummaryLatestDto,
  ServiceResultsSummaryPreviewDto,
  ServiceResultsSummaryRow,
} from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership } from '../../common/utils/scope.util';
import { sanitizeFilename } from '../../common/utils/filename.util';
import { warnIfSuspiciousLimit } from '../../common/utils/pdf-text.util';
import { SCHEDULE_REPOSITORY, ScheduleRepository, ScheduleWithRelations } from '../schedules/domain/schedule.repository';
import { FILE_STORAGE_SERVICE, FileStorageService } from '../attachments/domain/file-storage.interface';
import { buildResultsSummaryPdfBuffer } from './application/results-summary-pdf.util';
import { categorizeParameter, categoryOrderIndex } from './application/parameter-category.util';
import {
  buildBarreiraComparison,
  FIRST_BARREIRA_STANDARD_NAME,
  SECOND_BARREIRA_STANDARD_NAME,
} from './application/barreira-comparison.util';

// Metadado de coleta, não resultado de composto — nunca deve aparecer no
// resumo (pedido explícito do usuário).
const EXCLUDED_PARAMETER_NAMES = new Set(['Volume Amostrado']);

interface ConsolidatedData {
  rows: ServiceResultsSummaryRow[];
  barreiraComparison: BarreiraComparisonRow[] | null;
}

function formatDateUTC(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatPeriod(schedule: ScheduleWithRelations): string {
  return schedule.endDate && schedule.endDate.getTime() !== schedule.scheduledDate.getTime()
    ? `${formatDateUTC(schedule.scheduledDate)} a ${formatDateUTC(schedule.endDate)}`
    : formatDateUTC(schedule.scheduledDate);
}

@Injectable()
export class ServiceResultsSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCHEDULE_REPOSITORY) private readonly scheduleRepository: ScheduleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  // Junta todos os resultados já lançados (SampleResultRow) das amostras
  // ativas do serviço, agrupados por ponto de amostragem na MESMA ordem já
  // usada na tela de resultados (schedule.samplingPoints, depois
  // point.compounds) — não recalcula nem digita nada novo, só reorganiza o
  // que já está salvo. Amostras fora da estrutura configurada (mesmo caso
  // de "Outras análises" na tela) entram no fim, sem se perder. "Volume
  // Amostrado" é excluído (metadado de coleta, não resultado de composto —
  // pedido do usuário) e cada linha ganha uma categoria pra agrupamento
  // visual dentro do ponto.
  private async buildConsolidatedRows(
    schedule: ScheduleWithRelations,
    scheduleLabel: string,
  ): Promise<ServiceResultsSummaryRow[]> {
    const samples = await this.prisma.sample.findMany({
      where: { scheduleId: schedule.id, active: true },
      select: {
        id: true,
        samplingPointId: true,
        compoundId: true,
        samplingPoint: { select: { id: true, name: true } },
        resultRows: {
          orderBy: { order: 'asc' },
          select: { parameterName: true, result: true, unit: true, specLimit: true, compliance: true, notes: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byPointCompound = new Map<string, typeof samples>();
    for (const sample of samples) {
      if (!sample.samplingPointId || !sample.compoundId) continue;
      const key = `${sample.samplingPointId}|${sample.compoundId}`;
      const list = byPointCompound.get(key) ?? [];
      list.push(sample);
      byPointCompound.set(key, list);
    }

    const buildRow = (
      samplingPointId: string,
      samplingPointName: string,
      row: { parameterName: string; result: string; unit: string; specLimit: string | null; compliance: unknown; notes: string | null },
    ): ServiceResultsSummaryRow => {
      warnIfSuspiciousLimit(`${scheduleLabel} / ${samplingPointName} / ${row.parameterName}`, row.specLimit);
      return {
        samplingPointId,
        samplingPointName,
        category: categorizeParameter(row.parameterName),
        parameterName: row.parameterName,
        result: row.result,
        unit: row.unit,
        specLimit: row.specLimit,
        compliance: (row.compliance as ComplianceStatus | null) ?? null,
        notes: row.notes,
      };
    };

    const rows: ServiceResultsSummaryRow[] = [];
    const consumedSampleIds = new Set<string>();

    for (const point of schedule.samplingPoints ?? []) {
      for (const compound of point.compounds) {
        const key = `${point.samplingPoint.id}|${compound.compound.id}`;
        const matched = byPointCompound.get(key) ?? [];
        for (const sample of matched) {
          consumedSampleIds.add(sample.id);
          for (const row of sample.resultRows) {
            if (EXCLUDED_PARAMETER_NAMES.has(row.parameterName)) continue;
            rows.push(buildRow(point.samplingPoint.id, point.samplingPoint.name, row));
          }
        }
      }
    }

    for (const sample of samples) {
      if (consumedSampleIds.has(sample.id)) continue;
      for (const row of sample.resultRows) {
        if (EXCLUDED_PARAMETER_NAMES.has(row.parameterName)) continue;
        rows.push(buildRow(sample.samplingPointId ?? 'sem-ponto', sample.samplingPoint?.name ?? 'Outras análises', row));
      }
    }

    // Dentro de cada ponto, ordena por categoria (CATEGORY_ORDER) mantendo a
    // ordem relativa original dentro da mesma categoria (sort estável).
    const pointOrder = new Map((schedule.samplingPoints ?? []).map((p, index) => [p.samplingPoint.id, index]));
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const pointDiff = (pointOrder.get(a.row.samplingPointId) ?? 999) - (pointOrder.get(b.row.samplingPointId) ?? 999);
        if (pointDiff !== 0) return pointDiff;
        const categoryDiff = categoryOrderIndex(a.row.category) - categoryOrderIndex(b.row.category);
        if (categoryDiff !== 0) return categoryDiff;
        return a.index - b.index;
      })
      .map(({ row }) => row);
  }

  // Separa a comparação 1ª→2ª Barreira (quando o serviço tem os dois
  // pontos) do resto — os parâmetros que entraram na comparação saem das
  // tabelas por ponto pra não duplicar a mesma informação nas duas seções
  // (mesmo corte usado no PDF e na pré-visualização).
  private async buildConsolidatedData(schedule: ScheduleWithRelations, scheduleLabel: string): Promise<ConsolidatedData> {
    const rows = await this.buildConsolidatedRows(schedule, scheduleLabel);

    const points = schedule.samplingPoints ?? [];
    if (points.length === 0) return { rows, barreiraComparison: null };

    const standards = await this.prisma.samplingPoint.findMany({
      where: { id: { in: points.map((p) => p.samplingPoint.id) } },
      select: { id: true, standard: { select: { name: true } } },
    });
    const standardByPointId = new Map(standards.map((s) => [s.id, s.standard?.name ?? null]));

    const firstBarreiraPoint = points.find((p) => standardByPointId.get(p.samplingPoint.id) === FIRST_BARREIRA_STANDARD_NAME);
    const secondBarreiraPoint = points.find((p) => standardByPointId.get(p.samplingPoint.id) === SECOND_BARREIRA_STANDARD_NAME);

    if (!firstBarreiraPoint || !secondBarreiraPoint) {
      return { rows, barreiraComparison: null };
    }

    const firstRows = rows.filter((r) => r.samplingPointId === firstBarreiraPoint.samplingPoint.id);
    const secondRows = rows.filter((r) => r.samplingPointId === secondBarreiraPoint.samplingPoint.id);
    const comparison = buildBarreiraComparison(firstRows, secondRows);

    if (comparison.length === 0) return { rows, barreiraComparison: null };

    const comparedParameterNames = new Set(comparison.map((c) => c.parameterName));
    const remainingRows = rows.filter(
      (r) =>
        !comparedParameterNames.has(r.parameterName) ||
        (r.samplingPointId !== firstBarreiraPoint.samplingPoint.id &&
          r.samplingPointId !== secondBarreiraPoint.samplingPoint.id),
    );

    return { rows: remainingRows, barreiraComparison: comparison };
  }

  private async loadSchedule(scheduleId: string, user: AuthenticatedUser): Promise<ScheduleWithRelations> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) throw new NotFoundException('Agendamento não encontrado.');
    assertOwnership(user, { clientId: schedule.clientId });
    return schedule;
  }

  async getPreview(scheduleId: string, user: AuthenticatedUser): Promise<ServiceResultsSummaryPreviewDto> {
    const schedule = await this.loadSchedule(scheduleId, user);
    const client = await this.prisma.client.findUnique({ where: { id: schedule.clientId } });
    if (!client) throw new NotFoundException('Empresa não encontrada.');

    const { rows, barreiraComparison } = await this.buildConsolidatedData(
      schedule,
      `${client.companyName} / ${scheduleId}`,
    );

    const latest = await this.prisma.serviceResultsSummary.findFirst({
      where: { scheduleId },
      orderBy: { version: 'desc' },
      select: { comment: true },
    });

    return {
      scheduleId,
      clientName: client.companyName,
      cnpj: client.cnpj,
      formattedPeriod: formatPeriod(schedule),
      samplingPointNames: (schedule.samplingPoints ?? []).map((p) => p.samplingPoint.name),
      technicianNames: (schedule.technicians ?? []).map((t) => t.technician.name),
      rows,
      barreiraComparison,
      latestComment: latest?.comment ?? null,
    };
  }

  // Alimenta o indicador da tabela de Realizados (ver ScheduleListView) —
  // só a versão mais recente por serviço, numa única query pra N serviços
  // de uma vez (evita N+1 ao renderizar a tabela). Sem assertOwnership por
  // schedule: o controller já restringe esta rota a ADMIN/MANAGER, que
  // enxergam todos os serviços mesmo assim.
  async getLatestByScheduleIds(scheduleIds: string[]): Promise<ServiceResultsSummaryLatestDto[]> {
    if (scheduleIds.length === 0) return [];

    const rows = await this.prisma.serviceResultsSummary.findMany({
      where: { scheduleId: { in: scheduleIds } },
      orderBy: [{ scheduleId: 'asc' }, { version: 'desc' }],
      include: { generatedBy: { select: { name: true } } },
    });

    // orderBy garante version desc dentro de cada scheduleId — a primeira
    // ocorrência de cada scheduleId já é a versão mais recente.
    const latestByScheduleId = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByScheduleId.has(row.scheduleId)) latestByScheduleId.set(row.scheduleId, row);
    }

    return Array.from(latestByScheduleId.values()).map((row) => ({
      scheduleId: row.scheduleId,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      generatedByName: row.generatedBy.name,
    }));
  }

  async listVersions(scheduleId: string, user: AuthenticatedUser): Promise<ServiceResultsSummaryDto[]> {
    await this.loadSchedule(scheduleId, user);
    const versions = await this.prisma.serviceResultsSummary.findMany({
      where: { scheduleId },
      orderBy: { version: 'desc' },
      include: { generatedBy: { select: { name: true } } },
    });
    return versions.map((v) => this.toDto(v));
  }

  private toDto(summary: {
    id: string;
    scheduleId: string;
    version: number;
    comment: string;
    generatedBy: { name: string };
    createdAt: Date;
  }): ServiceResultsSummaryDto {
    return {
      id: summary.id,
      scheduleId: summary.scheduleId,
      version: summary.version,
      comment: summary.comment,
      generatedByName: summary.generatedBy.name,
      createdAt: summary.createdAt.toISOString(),
    };
  }

  // Sempre cria uma NOVA versão (nunca sobrescreve) — mesmo princípio de
  // Certificados/Reporte ANP: editar o comentário e gerar de novo é v2, v3...
  // com as anteriores continuando acessíveis no histórico.
  async generate(
    scheduleId: string,
    payload: GenerateServiceResultsSummaryPayload,
    user: AuthenticatedUser,
  ): Promise<ServiceResultsSummaryDto> {
    const schedule = await this.loadSchedule(scheduleId, user);
    const client = await this.prisma.client.findUnique({ where: { id: schedule.clientId } });
    if (!client) throw new NotFoundException('Empresa não encontrada.');

    const { rows, barreiraComparison } = await this.buildConsolidatedData(
      schedule,
      `${client.companyName} / ${scheduleId}`,
    );

    const lastVersion = await this.prisma.serviceResultsSummary.findFirst({
      where: { scheduleId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    const pdfBuffer = buildResultsSummaryPdfBuffer({
      clientName: client.companyName,
      cnpj: client.cnpj,
      formattedPeriod: formatPeriod(schedule),
      samplingPointNames: (schedule.samplingPoints ?? []).map((p) => p.samplingPoint.name),
      technicianNames: (schedule.technicians ?? []).map((t) => t.technician.name),
      version,
      comment: payload.comment,
      rows,
      barreiraComparison,
    });

    const safePeriod = formatPeriod(schedule).replace(/\//g, '-').replace(/ a /g, '_a_');
    const filename = `Resumo de Resultados ${safePeriod} ${sanitizeFilename(client.companyName)} v${version}.pdf`;

    const upload = await this.fileStorageService.upload({
      buffer: pdfBuffer,
      filename,
      mimeType: 'application/pdf',
    });
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

    const summary = await this.prisma.serviceResultsSummary.create({
      data: {
        scheduleId,
        version,
        comment: payload.comment,
        fileId: attachment.id,
        generatedById: user.id,
      },
      include: { generatedBy: { select: { name: true } } },
    });

    return this.toDto(summary);
  }

  async downloadFile(id: string, user: AuthenticatedUser) {
    const summary = await this.prisma.serviceResultsSummary.findUnique({
      where: { id },
      include: { file: true, schedule: { select: { clientId: true } } },
    });
    if (!summary) throw new NotFoundException('Resumo não encontrado.');
    assertOwnership(user, { clientId: summary.schedule.clientId });

    const stream = await this.fileStorageService.getStream(summary.file.storageKey);
    return { stream, filename: summary.file.filename, mimeType: summary.file.mimeType };
  }
}
