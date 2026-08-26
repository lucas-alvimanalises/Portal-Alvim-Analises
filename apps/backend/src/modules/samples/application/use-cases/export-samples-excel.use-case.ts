import { Inject, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { AuthenticatedUser, COMPLIANCE_STATUS_COLORS, COMPLIANCE_STATUS_LABELS_PT } from '@portal-alvim/shared';
import { ComplianceStatus } from '@prisma/client';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

export interface ExportSamplesExcelFilters {
  clientId: string;
  samplingPointIds?: string[];
  compoundIds?: string[];
  startDate?: string;
  endDate?: string;
}

export interface ExportedFile {
  buffer: Buffer;
  filename: string;
}

// Formata "AAAA-MM-DD" (data sem horário, mesmo padrão de Sample.collectionDate)
// como "DD/MM/AAAA" — em UTC, pra não deslocar um dia por causa do fuso local
// de quem gerou o arquivo.
function formatDateUtc(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Nome de arquivo seguro (sem acentos/caracteres especiais que confundem
// alguns navegadores/SOs no Content-Disposition).
function sanitizeFilenamePart(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Exportação em Excel do Histórico — sob demanda, gerada na hora (sem
// persistir como Attachment/relatório versionado, diferente de
// AnpMonthlyReport/ServiceResultsSummary: aqui é sempre um retrato dos dados
// atuais, não um documento oficial que precisa de histórico de versões).
// Liberado pra todo mundo que já acessa o Histórico hoje (ver
// SamplesController @Roles em GET /samples), incluindo CLIENT — só da
// própria empresa (assertOwnership abaixo).
@Injectable()
export class ExportSamplesExcelUseCase {
  constructor(@Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository) {}

  async execute(user: AuthenticatedUser, filters: ExportSamplesExcelFilters): Promise<ExportedFile> {
    assertOwnership(user, { clientId: filters.clientId });

    const where: Record<string, unknown> = { clientId: filters.clientId, active: true };
    if (filters.samplingPointIds?.length) {
      where.samplingPointId = { in: filters.samplingPointIds };
    }
    if (filters.compoundIds?.length) {
      where.compoundId = { in: filters.compoundIds };
    }
    if (filters.startDate || filters.endDate) {
      const range: Record<string, Date> = {};
      if (filters.startDate) range.gte = new Date(`${filters.startDate}T00:00:00Z`);
      if (filters.endDate) range.lte = new Date(`${filters.endDate}T23:59:59Z`);
      where.collectionDate = range;
    }

    const samples = await this.sampleRepository.findMany(where);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Histórico');

    sheet.columns = [
      { header: 'Empresa', key: 'clientName', width: 28 },
      { header: 'Ponto de amostragem', key: 'samplingPointName', width: 24 },
      { header: 'Composto', key: 'compoundName', width: 20 },
      { header: 'Data da coleta', key: 'collectionDate', width: 14 },
      { header: 'Código da amostra', key: 'sampleCode', width: 16 },
      { header: 'Parâmetro', key: 'parameterName', width: 28 },
      { header: 'Resultado', key: 'result', width: 14 },
      { header: 'Unidade', key: 'unit', width: 14 },
      { header: 'Limite regulatório', key: 'specLimit', width: 20 },
      { header: 'Conformidade', key: 'compliance', width: 20 },
      { header: 'Observações', key: 'notes', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E5E9' } };
    sheet.autoFilter = { from: 'A1', to: 'K1' };

    for (const sample of samples) {
      const rows = sample.resultRows ?? [];
      // Amostra ainda sem resultado lançado: entra mesmo assim como uma
      // linha "vazia" (confirma que a coleta existe/foi agendada), em vez
      // de sumir silenciosamente da planilha.
      if (rows.length === 0) {
        sheet.addRow({
          clientName: sample.client?.companyName ?? '-',
          samplingPointName: sample.samplingPoint?.name ?? '-',
          compoundName: sample.compound?.name ?? '-',
          collectionDate: formatDateUtc(sample.collectionDate),
          sampleCode: sample.sampleCode ?? '-',
          parameterName: '-',
          result: 'Aguardando resultado',
          unit: '',
          specLimit: '',
          compliance: '',
          notes: sample.notes ?? '',
        });
        continue;
      }

      for (const row of rows) {
        const excelRow = sheet.addRow({
          clientName: sample.client?.companyName ?? '-',
          samplingPointName: sample.samplingPoint?.name ?? '-',
          compoundName: sample.compound?.name ?? '-',
          collectionDate: formatDateUtc(sample.collectionDate),
          sampleCode: sample.sampleCode ?? '-',
          parameterName: row.parameterName,
          result: row.result,
          unit: row.unit,
          specLimit: row.specLimit ?? '',
          compliance: row.compliance ? COMPLIANCE_STATUS_LABELS_PT[row.compliance] : '',
          notes: row.notes ?? '',
        });

        // Mesma cor de fundo já usada na tela do Histórico (COMPLIANCE_STATUS_COLORS)
        // pra quem abre a planilha reconhecer visualmente Não Conforme/Atenção
        // sem precisar ler a coluna.
        if (row.compliance) {
          const color = COMPLIANCE_STATUS_COLORS[row.compliance as ComplianceStatus];
          const argb = `FF${color.background.replace('#', '').toUpperCase()}`;
          excelRow.getCell('compliance').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
        }
      }
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const companyName = samples[0]?.client?.companyName ?? 'historico';
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `historico-${sanitizeFilenamePart(companyName)}-${datePart}.xlsx`;

    return { buffer, filename };
  }
}
