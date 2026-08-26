import { Inject, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { AuthenticatedUser, COMPLIANCE_STATUS_COLORS, COMPLIANCE_STATUS_LABELS_PT } from '@portal-alvim/shared';
import { ComplianceStatus } from '@prisma/client';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { getLogoBase64 } from '../../../../common/utils/pdf-logo.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../domain/sample.repository';

// Parâmetro de identificação da amostra (volume coletado), não um
// resultado analítico — vem só do molde de Siloxanos (ver
// scripts/seed-siloxanos-certificate-analyte-template.ts, comentário
// "está na tabela de identificação da amostra, não na tabela de
// resultados"). Nunca deve entrar na planilha de resultados (pedido do
// usuário: só quer o que é medido em mg/m³ etc., não o volume amostrado).
const NON_ANALYTICAL_PARAMETER_NAMES = new Set(['Volume Amostrado']);

const BRAND_GREEN = 'FF1F5F4D';
const BRAND_GREEN_LIGHT = 'FF2F7A63';
const ZEBRA_FILL = 'FFF3F5F4';
const THIN_BORDER: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD5DAD9' } };

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

    // Sequência pedida pelo usuário: todos os resultados de um ponto de
    // amostragem juntos (por composto, depois cronológico) antes de passar
    // pro próximo ponto — em vez da ordem "mais recente primeiro" misturando
    // pontos, que é a ordem natural de findMany (ver INCLUDE_RELATIONS/orderBy
    // em prisma-sample.repository.ts).
    const sortedSamples = [...samples].sort((a, b) => {
      const point = (a.samplingPoint?.name ?? '').localeCompare(b.samplingPoint?.name ?? '', 'pt-BR');
      if (point !== 0) return point;
      const compound = (a.compound?.name ?? '').localeCompare(b.compound?.name ?? '', 'pt-BR');
      if (compound !== 0) return compound;
      return a.collectionDate.getTime() - b.collectionDate.getTime();
    });

    const companyLabel = samples[0]?.client?.companyName ?? 'Histórico';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Alvim Análises';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Histórico', { views: [{ showGridLines: false }] });

    const columnDefs = [
      { key: 'clientName', header: 'Empresa', width: 26 },
      { key: 'samplingPointName', header: 'Ponto de amostragem', width: 22 },
      { key: 'compoundName', header: 'Composto', width: 20 },
      { key: 'collectionDate', header: 'Data da coleta', width: 14 },
      { key: 'sampleCode', header: 'Código da amostra', width: 18 },
      { key: 'parameterName', header: 'Parâmetro', width: 30 },
      { key: 'result', header: 'Resultado', width: 16 },
      { key: 'unit', header: 'Unidade', width: 14 },
      { key: 'specLimit', header: 'Limite regulatório', width: 24 },
      { key: 'compliance', header: 'Conformidade', width: 20 },
      { key: 'notes', header: 'Observações', width: 30 },
    ];
    sheet.columns = columnDefs.map(({ key, width }) => ({ key, width }));
    const lastColLetter = String.fromCharCode('A'.charCodeAt(0) + columnDefs.length - 1); // 'K'

    // Linha 1 em branco reservada só pra logo (fundo branco) — colar a
    // imagem direto sobre a faixa verde do título ficaria com o retângulo
    // branco do JPEG por cima da cor, então a logo fica isolada antes dela.
    sheet.getRow(1).height = 54;
    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      const imageId = workbook.addImage({ base64: `data:image/jpeg;base64,${logoBase64}`, extension: 'jpeg' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.08 }, ext: { width: 96, height: 70 } });
    }

    // Linha 2: faixa de título (marca Alvim).
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const titleCell = sheet.getCell('A2');
    titleCell.value = `Histórico de Análises — ${companyLabel}`;
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', indent: 1 };
    sheet.getRow(2).height = 30;
    sheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN } };

    // Linha 3: subtítulo com data/hora de geração e o período filtrado (se
    // algum tiver sido escolhido) — pra quem recebe o arquivo saber na hora
    // se está vendo o histórico completo ou um recorte.
    const periodLabel =
      filters.startDate || filters.endDate
        ? ` · Período: ${filters.startDate ? new Date(`${filters.startDate}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'início'} a ${filters.endDate ? new Date(`${filters.endDate}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'hoje'}`
        : '';
    sheet.mergeCells(`A3:${lastColLetter}3`);
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = `Gerado em ${new Date().toLocaleString('pt-BR')}${periodLabel}`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    subtitleCell.alignment = { indent: 1 };
    sheet.getRow(3).height = 18;

    sheet.getRow(4).height = 8; // espaçador

    // Linha 5: cabeçalho da tabela de verdade.
    const headerRowIndex = 5;
    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = columnDefs.map((c) => c.header);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN_LIGHT } };
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: THIN_BORDER };
    });
    headerRow.height = 20;
    sheet.autoFilter = { from: `A${headerRowIndex}`, to: `${lastColLetter}${headerRowIndex}` };
    sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: headerRowIndex }];

    let dataRowCount = 0;
    function addDataRow(values: Record<string, string>, compliance?: ComplianceStatus | null) {
      const excelRow = sheet.addRow(values);
      dataRowCount++;
      const zebra = dataRowCount % 2 === 0;
      excelRow.eachCell((cell) => {
        cell.border = { bottom: THIN_BORDER };
        if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } };
      });
      // Mesma cor de fundo já usada na tela do Histórico (COMPLIANCE_STATUS_COLORS)
      // pra quem abre a planilha reconhecer visualmente Não Conforme/Atenção
      // sem precisar ler a coluna — sobrepõe a listra zebrada de propósito.
      if (compliance) {
        const color = COMPLIANCE_STATUS_COLORS[compliance];
        const argb = `FF${color.background.replace('#', '').toUpperCase()}`;
        excelRow.getCell('compliance').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
      }
    }

    for (const sample of sortedSamples) {
      const base = {
        clientName: sample.client?.companyName ?? '-',
        samplingPointName: sample.samplingPoint?.name ?? '-',
        compoundName: sample.compound?.name ?? '-',
        collectionDate: formatDateUtc(sample.collectionDate),
        sampleCode: sample.sampleCode ?? '-',
      };
      const rows = (sample.resultRows ?? []).filter((row) => !NON_ANALYTICAL_PARAMETER_NAMES.has(row.parameterName));

      // Amostra ainda sem resultado analítico lançado: entra mesmo assim
      // como uma linha "vazia" (confirma que a coleta existe/foi agendada),
      // em vez de sumir silenciosamente da planilha.
      if (rows.length === 0) {
        addDataRow({
          ...base,
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
        addDataRow(
          {
            ...base,
            parameterName: row.parameterName,
            result: row.result,
            unit: row.unit,
            specLimit: row.specLimit ?? '',
            compliance: row.compliance ? COMPLIANCE_STATUS_LABELS_PT[row.compliance] : '',
            notes: row.notes ?? '',
          },
          row.compliance,
        );
      }
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `historico-${sanitizeFilenamePart(companyLabel)}-${datePart}.xlsx`;

    return { buffer, filename };
  }
}
