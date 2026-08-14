import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  AnpComplianceAffectedClientDto,
  AnpDashboardComplianceDto,
  AnpEligibleClientDto,
  AnpModuleSummaryDto,
  AnpMonthBadgeDto,
  AnpMonthDetailDto,
  AnpMonthlyReportDto,
  AnpMonthStatus,
  AnpReportParameter,
  AnpReportResultRow,
  AuthenticatedUser,
  ComplianceStatus,
  Role,
} from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership } from '../../common/utils/scope.util';
import { sanitizeFilename } from '../../common/utils/filename.util';
import { FILE_STORAGE_SERVICE, FileStorageService } from '../attachments/domain/file-storage.interface';
import { computeAnpCompliance, formatAnpResult } from './application/anp-compliance.util';
import { buildAnpReportPdfBuffer } from './application/anp-report-pdf.util';

// Nome exato já seedado (ordinal feminino "1ª", não "1º") — ver
// apps/backend/prisma/seed.ts.
const ANP_STANDARD_NAME = '1ª Barreira (ANP)';
const MONITORAMENTO_MENSAL_SERVICE_TYPE_NAME = 'Monitoramento mensal';
const SILOXANOS_COMPOUND_CODE = '11000';
const VOCS_COMPOUND_CODE = '12000';
const SILOXANOS_PARAMETER_LABEL = 'Concentração Total de Siloxanos';
const CLORADOS_PARAMETER_LABEL = 'Somatório Clorados';
const FLUORADOS_PARAMETER_LABEL = 'Somatório Fluorados';

// Um resultado bruto — uma linha por (amostra, parâmetro). Quando há mais
// de um atendimento no mês (2 visitas, por exemplo), cada visita gera sua
// própria amostra/resultado, e TODOS entram no reporte (confirmado com o
// usuário) — nada é descartado/deduplicado por mês.
interface RawResultEntry {
  parameter: AnpReportParameter;
  resultRowId: string;
  resultText: string;
  unit: string;
  collectionDate: Date;
  // Nº do certificado emitido pelo laboratório pra essa amostra — o cliente
  // precisa dele pra anexar no portal da ANP junto com o reporte (pedido do
  // usuário). Null quando a amostra ainda não tem certificado anexado.
  certificateNumber: string | null;
}

const PARAMETER_ORDER: AnpReportParameter[] = [
  AnpReportParameter.SILOXANOS,
  AnpReportParameter.CLORADOS,
  AnpReportParameter.FLUORADOS,
];

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

// "Completo" agora significa: os 3 parâmetros aparecem PELO MENOS UMA VEZ
// no mês (em qualquer amostra/visita) — não precisa ser a mesma visita.
function isMonthComplete(entries: RawResultEntry[] | undefined): entries is RawResultEntry[] {
  if (!entries || entries.length === 0) return false;
  const present = new Set(entries.map((e) => e.parameter));
  return PARAMETER_ORDER.every((p) => present.has(p));
}

@Injectable()
export class AnpMonthlyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  private async getCompoundIds(): Promise<{ siloxanosId: string; vocsId: string } | null> {
    const [siloxanos, vocs] = await Promise.all([
      this.prisma.compound.findUnique({ where: { code: SILOXANOS_COMPOUND_CODE }, select: { id: true } }),
      this.prisma.compound.findUnique({ where: { code: VOCS_COMPOUND_CODE }, select: { id: true } }),
    ]);
    if (!siloxanos || !vocs) return null;
    return { siloxanosId: siloxanos.id, vocsId: vocs.id };
  }

  private async findAnpSamplingPoint(clientId: string) {
    return this.prisma.samplingPoint.findFirst({
      where: { clientId, active: true, standard: { name: ANP_STANDARD_NAME } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Todos os resultados (Siloxanos/Clorados/Fluorados) já agrupados por mês,
  // a partir das Sample ativas do ponto ANP — uma consulta só cobre todo o
  // intervalo pedido (evita N+1 ao montar a grade de meses). Quando há mais
  // de um atendimento no mês, TODAS as amostras entram (nada é descartado
  // por "mais recente" — ver PARAMETER_ORDER/isMonthComplete acima).
  private async loadRawResultsByMonth(
    clientId: string,
    samplingPointId: string,
    siloxanosId: string,
    vocsId: string,
  ): Promise<Map<string, RawResultEntry[]>> {
    const samples = await this.prisma.sample.findMany({
      where: {
        clientId,
        samplingPointId,
        compoundId: { in: [siloxanosId, vocsId] },
        active: true,
      },
      select: {
        compoundId: true,
        collectionDate: true,
        resultRows: { select: { id: true, parameterName: true, result: true, unit: true } },
        // Só o mais recente — na prática existe 1 certificado por amostra
        // (mesma premissa já usada em DownloadCertificateBySampleUseCase).
        certificates: {
          select: { certificateNumber: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const result = new Map<string, RawResultEntry[]>();

    function addEntry(sample: (typeof samples)[number], parameter: AnpReportParameter, label: string) {
      const row = sample.resultRows.find((r) => r.parameterName === label);
      if (!row) return;
      const year = sample.collectionDate.getUTCFullYear();
      const month = sample.collectionDate.getUTCMonth() + 1;
      const mk = monthKey(year, month);
      const list = result.get(mk) ?? [];
      list.push({
        parameter,
        resultRowId: row.id,
        resultText: row.result,
        unit: row.unit,
        collectionDate: sample.collectionDate,
        certificateNumber: sample.certificates[0]?.certificateNumber ?? null,
      });
      result.set(mk, list);
    }

    samples.forEach((sample) => {
      if (sample.compoundId === siloxanosId) {
        addEntry(sample, AnpReportParameter.SILOXANOS, SILOXANOS_PARAMETER_LABEL);
      } else if (sample.compoundId === vocsId) {
        addEntry(sample, AnpReportParameter.CLORADOS, CLORADOS_PARAMETER_LABEL);
        addEntry(sample, AnpReportParameter.FLUORADOS, FLUORADOS_PARAMETER_LABEL);
      }
    });

    return result;
  }

  // Grade de status mês-a-mês (do início do "Monitoramento mensal" até o
  // mês corrente) — usada tanto pela grade de nível 2 (listMonths) quanto
  // pelo indicador "tem algo pra liberar" da lista de nível 1
  // (listEligibleClients). Ordem cronológica crescente; quem precisa do
  // mais recente primeiro inverte por conta própria.
  private async computeMonthBadges(
    clientId: string,
    point: { id: string } | null,
    compoundIds: { siloxanosId: string; vocsId: string } | null,
  ): Promise<AnpMonthBadgeDto[]> {
    const dateRange = await this.prisma.schedule.aggregate({
      where: { clientId, serviceType: { name: MONITORAMENTO_MENSAL_SERVICE_TYPE_NAME } },
      _min: { scheduledDate: true },
    });
    if (!dateRange._min.scheduledDate) return [];

    const rawByMonth =
      point && compoundIds
        ? await this.loadRawResultsByMonth(clientId, point.id, compoundIds.siloxanosId, compoundIds.vocsId)
        : new Map<string, RawResultEntry[]>();

    const reports = await this.prisma.anpMonthlyReport.findMany({
      where: { clientId },
      select: { year: true, month: true },
      distinct: ['year', 'month'],
    });
    const generatedMonths = new Set(reports.map((r) => monthKey(r.year, r.month)));

    const now = new Date();
    const start = dateRange._min.scheduledDate;
    const startYear = start.getUTCFullYear();
    const startMonth = start.getUTCMonth() + 1;
    const endYear = now.getUTCFullYear();
    const endMonth = now.getUTCMonth() + 1;

    const badges: AnpMonthBadgeDto[] = [];
    let year = startYear;
    let month = startMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const key = monthKey(year, month);
      const status = generatedMonths.has(key)
        ? AnpMonthStatus.GENERATED
        : isMonthComplete(rawByMonth.get(key))
          ? AnpMonthStatus.PENDING
          : AnpMonthStatus.MISSING_DATA;
      badges.push({ year, month, status });
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return badges;
  }

  private async getRegulatoryLimitsMap() {
    const limits = await this.prisma.anpRegulatoryLimit.findMany();
    // Prisma gera seu próprio tipo de enum ($Enums.AnpReportParameter),
    // estruturalmente igual mas nominalmente distinto do enum do pacote
    // shared — mesmo cast já usado em plant-maintenance.mapper.ts.
    return new Map(limits.map((l) => [l.parameter as AnpReportParameter, l]));
  }

  // Uma linha por entrada (não por parâmetro) — se houve 2 atendimentos no
  // mês, o mesmo parâmetro aparece 2 vezes, uma por data. Ordenado por data
  // e, dentro da mesma data, pela ordem fixa Siloxanos/Clorados/Fluorados.
  private buildRows(
    entries: RawResultEntry[],
    limits: Map<AnpReportParameter, { label: string; regulatoryLimit: number; unit: string }>,
  ): AnpReportResultRow[] {
    const sorted = [...entries].sort((a, b) => {
      const dateDiff = a.collectionDate.getTime() - b.collectionDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return PARAMETER_ORDER.indexOf(a.parameter) - PARAMETER_ORDER.indexOf(b.parameter);
    });

    return sorted.map((entry) => {
      const limit = limits.get(entry.parameter);
      const regulatoryLimit = limit?.regulatoryLimit ?? 0;
      const unit = limit?.unit ?? entry.unit;
      return {
        parameter: entry.parameter,
        label: limit?.label ?? entry.parameter,
        date: entry.collectionDate.toISOString(),
        result: formatAnpResult(entry.resultText, entry.unit),
        regulatoryLimit,
        unit,
        compliance: computeAnpCompliance(entry.resultText, regulatoryLimit),
        certificateNumber: entry.certificateNumber,
      };
    });
  }

  // Ordena por resultRowId antes de concatenar, pra o hash não depender da
  // ordem em que o banco devolveu as linhas.
  private sourceDataHash(entries: RawResultEntry[]): string {
    const raw = [...entries]
      .sort((a, b) => a.resultRowId.localeCompare(b.resultRowId))
      .map((e) => `${e.resultRowId}:${e.resultText}`)
      .join('|');
    return createHash('sha256').update(raw).digest('hex');
  }

  async listEligibleClients(user: AuthenticatedUser): Promise<AnpEligibleClientDto[]> {
    const clientFilter = user.role === Role.CLIENT ? { id: { in: user.clientIds } } : {};

    const clients = await this.prisma.client.findMany({
      where: {
        ...clientFilter,
        status: 'ACTIVE',
        schedules: { some: { serviceType: { name: MONITORAMENTO_MENSAL_SERVICE_TYPE_NAME } } },
        samplingPoints: { some: { active: true, standard: { name: ANP_STANDARD_NAME } } },
      },
      select: {
        id: true,
        companyName: true,
        samplingPoints: {
          where: { active: true, standard: { name: ANP_STANDARD_NAME } },
          select: { id: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const compoundIds = await this.getCompoundIds();
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    const results: AnpEligibleClientDto[] = [];
    for (const client of clients) {
      const lastReport = await this.prisma.anpMonthlyReport.findFirst({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const point = client.samplingPoints[0];
      const badges = point ? await this.computeMonthBadges(client.id, point, compoundIds) : [];
      const currentBadge = badges.find((b) => b.year === currentYear && b.month === currentMonth);
      const currentMonthStatus = currentBadge?.status ?? AnpMonthStatus.MISSING_DATA;
      // "Tem algo pra liberar" olha TODOS os meses, não só o corrente — um
      // mês passado pendente também deve acender o indicador (ver
      // AnpEligibleClientDto.hasPendingReports).
      const hasPendingReports = badges.some((b) => b.status === AnpMonthStatus.PENDING);

      results.push({
        clientId: client.id,
        clientName: client.companyName,
        anpPointCount: client.samplingPoints.length,
        lastReportGeneratedAt: lastReport?.createdAt.toISOString() ?? null,
        currentMonthStatus,
        hasPendingReports,
      });
    }

    return results;
  }

  async getSummary(user: AuthenticatedUser): Promise<AnpModuleSummaryDto> {
    const eligibleClients = await this.listEligibleClients(user);
    const lastReport = await this.prisma.anpMonthlyReport.findFirst({
      where: user.role === Role.CLIENT ? { clientId: { in: user.clientIds } } : {},
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      totalEligibleClients: eligibleClients.length,
      reportsGeneratedThisMonth: eligibleClients.filter((c) => c.currentMonthStatus === AnpMonthStatus.GENERATED)
        .length,
      pendingThisMonth: eligibleClients.filter((c) => c.currentMonthStatus === AnpMonthStatus.PENDING).length,
      nonConformingThisMonth: await this.countNonConformingThisMonth(eligibleClients.map((c) => c.clientId)),
      lastSystemUpdate: lastReport?.createdAt.toISOString() ?? null,
    };
  }

  private async countNonConformingThisMonth(clientIds: string[]): Promise<number> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const compoundIds = await this.getCompoundIds();
    if (!compoundIds) return 0;
    const limits = await this.getRegulatoryLimitsMap();

    let count = 0;
    for (const clientId of clientIds) {
      const point = await this.findAnpSamplingPoint(clientId);
      if (!point) continue;
      const rawByMonth = await this.loadRawResultsByMonth(
        clientId,
        point.id,
        compoundIds.siloxanosId,
        compoundIds.vocsId,
      );
      const data = rawByMonth.get(monthKey(year, month));
      if (!isMonthComplete(data)) continue;
      const rows = this.buildRows(data, limits);
      if (rows.some((r) => r.compliance === ComplianceStatus.NAO_CONFORME)) count += 1;
    }
    return count;
  }

  // Agregado pro bloco "Compliance do mês" do Dashboard (Admin/Gestor/
  // Técnico) — mesma fonte/cálculo de conformidade do módulo Reportes
  // Mensais ANP, sem escopo de cliente (painel cross-empresa, por isso não
  // recebe `user`: quem pode chamar essa rota já é decidido pelo @Roles do
  // controller, igual dashboard/summary).
  async getComplianceOverview(): Promise<AnpDashboardComplianceDto> {
    const clients = await this.prisma.client.findMany({
      where: {
        status: 'ACTIVE',
        schedules: { some: { serviceType: { name: MONITORAMENTO_MENSAL_SERVICE_TYPE_NAME } } },
        samplingPoints: { some: { active: true, standard: { name: ANP_STANDARD_NAME } } },
      },
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    });

    const compoundIds = await this.getCompoundIds();
    if (!compoundIds) {
      return { outOfSpecCount: 0, attentionCount: 0, affectedClients: [] };
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const limits = await this.getRegulatoryLimitsMap();

    let outOfSpecCount = 0;
    let attentionCount = 0;
    const affectedClients: AnpComplianceAffectedClientDto[] = [];

    for (const client of clients) {
      const point = await this.findAnpSamplingPoint(client.id);
      if (!point) continue;

      const rawByMonth = await this.loadRawResultsByMonth(
        client.id,
        point.id,
        compoundIds.siloxanosId,
        compoundIds.vocsId,
      );
      const data = rawByMonth.get(monthKey(year, month));
      if (!isMonthComplete(data)) continue;

      const rows = this.buildRows(data, limits);
      const outOfSpecRows = rows.filter((r) => r.compliance === ComplianceStatus.NAO_CONFORME).length;
      const attentionRows = rows.filter((r) => r.compliance === ComplianceStatus.ATENCAO).length;
      outOfSpecCount += outOfSpecRows;
      attentionCount += attentionRows;

      if (outOfSpecRows > 0) {
        affectedClients.push({ clientId: client.id, clientName: client.companyName, year, month });
      }
    }

    return { outOfSpecCount, attentionCount, affectedClients };
  }

  async listMonths(clientId: string, user: AuthenticatedUser): Promise<AnpMonthBadgeDto[]> {
    assertOwnership(user, { clientId });

    const point = await this.findAnpSamplingPoint(clientId);
    const compoundIds = await this.getCompoundIds();
    const badges = await this.computeMonthBadges(clientId, point, compoundIds);
    return badges.reverse();
  }

  async getMonthDetail(
    clientId: string,
    year: number,
    month: number,
    user: AuthenticatedUser,
  ): Promise<AnpMonthDetailDto> {
    assertOwnership(user, { clientId });

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Empresa não encontrada.');

    const point = await this.findAnpSamplingPoint(clientId);
    const compoundIds = await this.getCompoundIds();
    const limits = await this.getRegulatoryLimitsMap();

    const rawData =
      point && compoundIds
        ? (await this.loadRawResultsByMonth(clientId, point.id, compoundIds.siloxanosId, compoundIds.vocsId)).get(
            monthKey(year, month),
          )
        : undefined;

    const complete = isMonthComplete(rawData);
    const rows = complete ? this.buildRows(rawData, limits) : [];
    const currentHash = complete ? this.sourceDataHash(rawData) : null;

    const history = await this.prisma.anpMonthlyReport.findMany({
      where: { clientId, year, month },
      orderBy: { version: 'desc' },
      include: { generatedBy: { select: { name: true } }, client: { select: { companyName: true } } },
    });

    const currentReport = history[0] ?? null;
    const isStale = !!currentReport && (currentHash === null || currentHash !== currentReport.sourceDataHash);

    const status = currentReport
      ? AnpMonthStatus.GENERATED
      : complete
        ? AnpMonthStatus.PENDING
        : AnpMonthStatus.MISSING_DATA;

    const monthSchedules = await this.prisma.schedule.findMany({
      where: {
        clientId,
        serviceType: { name: MONITORAMENTO_MENSAL_SERVICE_TYPE_NAME },
        scheduledDate: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) },
      },
      include: { technicians: { include: { technician: { select: { name: true } } } } },
    });
    const technicianNames = Array.from(
      new Set(monthSchedules.flatMap((s) => s.technicians.map((t) => t.technician.name))),
    );

    return {
      clientId,
      clientName: client.companyName,
      cnpj: client.cnpj,
      year,
      month,
      samplingPointName: point?.name ?? null,
      technicianNames,
      status,
      rows,
      currentReport: currentReport ? this.toReportDto(currentReport) : null,
      isStale,
      history: history.map((h) => this.toReportDto(h)),
    };
  }

  private toReportDto(report: {
    id: string;
    clientId: string;
    client: { companyName: string };
    year: number;
    month: number;
    version: number;
    reportNumber: number;
    generatedBy: { name: string };
    createdAt: Date;
  }): AnpMonthlyReportDto {
    return {
      id: report.id,
      clientId: report.clientId,
      clientName: report.client.companyName,
      year: report.year,
      month: report.month,
      version: report.version,
      reportNumber: report.reportNumber,
      generatedByName: report.generatedBy.name,
      createdAt: report.createdAt.toISOString(),
    };
  }

  async generate(
    clientId: string,
    year: number,
    month: number,
    user: AuthenticatedUser,
  ): Promise<AnpMonthlyReportDto> {
    assertOwnership(user, { clientId });

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Empresa não encontrada.');

    const point = await this.findAnpSamplingPoint(clientId);
    if (!point) {
      throw new ConflictException(
        'Esta empresa não tem um ponto de amostragem ativo do tipo "1ª Barreira (ANP)".',
      );
    }
    const compoundIds = await this.getCompoundIds();
    if (!compoundIds) {
      throw new ConflictException('Compostos Siloxanos/VOCs não estão cadastrados no sistema.');
    }

    const rawByMonth = await this.loadRawResultsByMonth(
      clientId,
      point.id,
      compoundIds.siloxanosId,
      compoundIds.vocsId,
    );
    const data = rawByMonth.get(monthKey(year, month));
    if (!isMonthComplete(data)) {
      throw new ConflictException(
        'Ainda não há resultados suficientes (Siloxanos, Somatório de Fluorados e Somatório de Clorados) para este mês.',
      );
    }

    const limits = await this.getRegulatoryLimitsMap();
    const rows = this.buildRows(data, limits);
    const hash = this.sourceDataHash(data);

    const lastVersion = await this.prisma.anpMonthlyReport.findFirst({
      where: { clientId, year, month },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    const monthSchedules = await this.prisma.schedule.findMany({
      where: {
        clientId,
        serviceType: { name: MONITORAMENTO_MENSAL_SERVICE_TYPE_NAME },
        scheduledDate: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) },
      },
      include: { technicians: { include: { technician: { select: { name: true } } } } },
    });
    const technicianNames = Array.from(
      new Set(monthSchedules.flatMap((s) => s.technicians.map((t) => t.technician.name))),
    );

    // reportNumber precisa existir DENTRO do PDF, mas só é atribuído pelo
    // Postgres na hora do INSERT (coluna SERIAL, mesmo truque de
    // Schedule.orderNumber) — pedimos o próximo valor da sequência direto
    // (nextval é atômico/concorrente-seguro por natureza do Postgres) e
    // passamos explicitamente no create() abaixo, sem deixar o default
    // agir (ele só entra em jogo quando o campo é omitido).
    const [{ nextval }] = await this.prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval(pg_get_serial_sequence('anp_monthly_reports', 'reportNumber')) as nextval
    `;
    const reportNumber = Number(nextval);

    const pdfBuffer = buildAnpReportPdfBuffer({
      clientName: client.companyName,
      cnpj: client.cnpj,
      year,
      month,
      version,
      reportNumber,
      samplingPointName: point.name,
      technicianNames,
      rows,
    });

    const filename = `Reporte ANP ${String(month).padStart(2, '0')}-${year} ${sanitizeFilename(client.companyName)} v${version}.pdf`;
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

    const report = await this.prisma.anpMonthlyReport.create({
      data: {
        clientId,
        year,
        month,
        version,
        reportNumber,
        fileId: attachment.id,
        sourceDataHash: hash,
        generatedById: user.id,
      },
      include: { generatedBy: { select: { name: true } }, client: { select: { companyName: true } } },
    });

    return this.toReportDto(report);
  }

  async deleteVersion(reportId: string, user: AuthenticatedUser): Promise<void> {
    const report = await this.prisma.anpMonthlyReport.findUnique({
      where: { id: reportId },
      include: { file: true },
    });
    if (!report) throw new NotFoundException('Reporte não encontrado.');
    assertOwnership(user, { clientId: report.clientId });

    // Apaga o registro primeiro (libera a referência a fileId, que tem
    // onDelete: Restrict) — só depois o arquivo em si.
    await this.prisma.anpMonthlyReport.delete({ where: { id: reportId } });
    await this.fileStorageService.delete(report.file.storageKey);
    await this.prisma.attachment.delete({ where: { id: report.file.id } });
  }

  async downloadFile(reportId: string, user: AuthenticatedUser) {
    const report = await this.prisma.anpMonthlyReport.findUnique({
      where: { id: reportId },
      include: { file: true },
    });
    if (!report) throw new NotFoundException('Reporte não encontrado.');
    assertOwnership(user, { clientId: report.clientId });

    const stream = await this.fileStorageService.getStream(report.file.storageKey);
    return { stream, filename: report.file.filename, mimeType: report.file.mimeType };
  }
}
