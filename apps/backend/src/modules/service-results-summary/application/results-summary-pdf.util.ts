import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarreiraComparisonRow, ComplianceStatus, ServiceResultsSummaryRow } from '@portal-alvim/shared';
import { getLogoBase64 } from '../../../common/utils/pdf-logo.util';
import { sanitizePdfText } from '../../../common/utils/pdf-text.util';

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

const ACCENT_COLOR: [number, number, number] = [30, 58, 95];
const CATEGORY_HEADER_COLOR: [number, number, number] = [226, 232, 240];
const CATEGORY_HEADER_TEXT: [number, number, number] = [51, 65, 85];

const STATUS_DOT_COLOR: Record<ComplianceStatus, [number, number, number]> = {
  [ComplianceStatus.CONFORME]: [22, 163, 74],
  [ComplianceStatus.ATENCAO]: [217, 119, 6],
  [ComplianceStatus.NAO_CONFORME]: [185, 28, 28],
};
const STATUS_LABEL: Record<ComplianceStatus, string> = {
  [ComplianceStatus.CONFORME]: 'Conforme',
  [ComplianceStatus.ATENCAO]: 'Atenção',
  [ComplianceStatus.NAO_CONFORME]: 'Fora de especificação',
};

export interface ResultsSummaryPdfInput {
  clientName: string;
  cnpj: string;
  formattedPeriod: string;
  samplingPointNames: string[];
  technicianNames: string[];
  version: number;
  comment: string;
  rows: ServiceResultsSummaryRow[];
  barreiraComparison: BarreiraComparisonRow[] | null;
}

// Mesmo campo "rótulo em cima / valor embaixo" de anp-report-pdf.util.ts —
// reaproveita o layout já validado com o usuário pro Reporte ANP. Aqui o
// valor pode ser bem mais longo que no Reporte ANP (ex.: lista de vários
// pontos de amostragem do serviço) — quebra em até 2 linhas em vez de
// estourar a largura do cartão.
function drawField(doc: jsPDF, x: number, y: number, label: string, value: string, maxWidth = 220) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  const lines: string[] = doc.splitTextToSize(sanitizePdfText(value), maxWidth).slice(0, 2);
  lines.forEach((line, index) => doc.text(line, x, y + 14 + index * 13));
}

function formatResult(result: string, unit: string): string {
  const text = unit && !result.includes(unit) ? `${result} ${unit}` : result;
  return sanitizePdfText(text);
}

type HeaderCell = { content: string; colSpan: number; styles: Record<string, unknown> };
type BodyRow = HeaderCell[] | string[];
type RowMeta =
  | { type: 'point-header' }
  | { type: 'category-header' }
  | { type: 'data'; compliance: ComplianceStatus | null };

function buildPointHeaderRow(pointName: string): HeaderCell[] {
  return [
    {
      content: sanitizePdfText(pointName),
      colSpan: 4,
      styles: { fillColor: ACCENT_COLOR, textColor: 255, fontStyle: 'bold' as const, halign: 'left' as const },
    },
  ];
}

function buildCategoryHeaderRow(category: string): HeaderCell[] {
  return [
    {
      content: sanitizePdfText(category),
      colSpan: 4,
      styles: {
        fillColor: CATEGORY_HEADER_COLOR,
        textColor: CATEGORY_HEADER_TEXT,
        fontStyle: 'bold' as const,
        halign: 'left' as const,
        fontSize: 8.5,
      },
    },
  ];
}

// Desenha o indicador ✅/⚠️/🔴 pedido pelo usuário como um círculo vetorial
// (não como emoji de texto) — emoji não tem glyph nas fontes Standard-14 do
// jsPDF e corrompe a célula (mesmo bug já corrigido no Reporte ANP). Um
// círculo colorido + rótulo em texto transmite a mesma informação sem esse
// risco, e ainda funciona em impressão P&B (a cor some, mas o texto continua
// legível).
function drawStatusIndicator(doc: jsPDF, cell: { x: number; y: number; width: number; height: number }, compliance: ComplianceStatus) {
  const centerY = cell.y + cell.height / 2;
  const dotX = cell.x + 10;
  const [r, g, b] = STATUS_DOT_COLOR[compliance];
  doc.setFillColor(r, g, b);
  doc.circle(dotX, centerY, 3.5, 'F');

  doc.setFont('helvetica', compliance === ComplianceStatus.NAO_CONFORME ? 'bold' : 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(r, g, b);
  doc.text(STATUS_LABEL[compliance], dotX + 8, centerY + 3.5);
  doc.setTextColor(0);
}

const RESULTS_COLUMN_STYLES = {
  0: { cellWidth: 190 },
  1: { cellWidth: 130 },
  2: { cellWidth: 100 },
  3: { cellWidth: 95 },
};

// Layout no mesmo padrão visual do Reporte Mensal ANP (jsPDF + jspdf-autotable,
// logo via getLogoBase64(), faixa de destaque, bloco de dados, tabela com
// linha inteira vermelha quando fora de especificação) — pedido explícito do
// usuário pra manter consistência visual entre os documentos gerados pelo
// portal.
export function buildResultsSummaryPdfBuffer(input: ResultsSummaryPdfInput): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const usableWidth = pageWidth - marginX * 2;
  let y = 50;

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    const logoWidth = 110;
    const logoHeight = 80;
    doc.addImage(logoBase64, 'JPEG', pageWidth - marginX - logoWidth, 24, logoWidth, logoHeight);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(20);
  doc.text('Resumo de Resultados do Serviço', marginX, y);
  y += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(`Consolidado de todos os pontos e compostos analisados`, marginX, y);
  y += 10;

  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(marginX, y, 64, 3, 'F');
  y += 28;

  const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const cardTop = y;
  const cardHeight = 150;
  doc.setDrawColor(225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, cardTop, usableWidth, cardHeight, 5, 5, 'FD');

  const col1X = marginX + 20;
  const col2X = marginX + usableWidth / 2 + 10;
  let fieldY = cardTop + 28;
  const rowHeight = 34;

  drawField(doc, col1X, fieldY, 'Empresa', input.clientName);
  drawField(doc, col2X, fieldY, 'CNPJ', input.cnpj);
  fieldY += rowHeight;

  drawField(doc, col1X, fieldY, 'Período do serviço', input.formattedPeriod);
  drawField(
    doc,
    col2X,
    fieldY,
    'Pontos de amostragem',
    input.samplingPointNames.length > 0 ? input.samplingPointNames.join(', ') : '-',
  );
  fieldY += rowHeight;

  drawField(
    doc,
    col1X,
    fieldY,
    'Responsável técnico',
    input.technicianNames.length > 0 ? input.technicianNames.join(', ') : '-',
  );
  drawField(doc, col2X, fieldY, 'Data de emissão', today);
  fieldY += rowHeight;

  drawField(doc, col1X, fieldY, 'Número do relatório', `v${input.version}`);

  doc.setTextColor(0);
  y = cardTop + cardHeight + 30;

  // Seção comparativa 1ª → 2ª Barreira — só existe quando o serviço tem os
  // dois pontos e há parâmetros em comum (ver barreira-comparison.util.ts).
  // Vem ANTES das tabelas por ponto (pedido do usuário).
  if (input.barreiraComparison && input.barreiraComparison.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(sanitizePdfText('1ª Barreira → 2ª Barreira'), marginX, y);
    y += 18;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Composto', '1ª Barreira', '2ª Barreira', 'Variação']],
      columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 120 }, 2: { cellWidth: 120 }, 3: { cellWidth: 95 } },
      body: input.barreiraComparison.map((c) => [
        sanitizePdfText(c.parameterName),
        sanitizePdfText(c.firstBarreiraValue),
        sanitizePdfText(c.secondBarreiraValue),
        sanitizePdfText(c.variationLabel),
      ]),
      headStyles: { fillColor: ACCENT_COLOR, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9.5, cellPadding: 7, valign: 'middle' },
      theme: 'grid',
    });

    y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 26;
  }

  // Tabela(s) por ponto restante — agrupada por ponto e, dentro do ponto,
  // por categoria de parâmetro (ver parameter-category.util.ts). Linhas já
  // vêm sem os parâmetros usados na comparação acima (ver
  // ServiceResultsSummaryService.buildConsolidatedData) e sem "Volume
  // Amostrado" (excluído na origem).
  const body: BodyRow[] = [];
  const bodyMeta: RowMeta[] = [];
  let currentPoint: string | null = null;
  let currentCategory: string | null = null;
  for (const row of input.rows) {
    if (row.samplingPointName !== currentPoint) {
      currentPoint = row.samplingPointName;
      currentCategory = null;
      body.push(buildPointHeaderRow(currentPoint));
      bodyMeta.push({ type: 'point-header' });
    }
    if (row.category !== currentCategory) {
      currentCategory = row.category;
      body.push(buildCategoryHeaderRow(currentCategory));
      bodyMeta.push({ type: 'category-header' });
    }
    body.push([
      sanitizePdfText(row.parameterName),
      formatResult(row.result, row.unit),
      row.specLimit ? sanitizePdfText(row.specLimit) : '',
      '', // Situação é desenhada à parte (ver drawStatusIndicator/didDrawCell) — sem emoji de texto.
    ]);
    bodyMeta.push({ type: 'data', compliance: row.compliance });
  }

  if (body.length === 0) {
    body.push(['Nenhum resultado lançado ainda para este serviço.', '', '', '']);
    bodyMeta.push({ type: 'data', compliance: null });
  }

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Parâmetro', 'Resultado', 'Limite', 'Situação']],
    columnStyles: RESULTS_COLUMN_STYLES,
    body: body as (string | HeaderCell)[][],
    headStyles: { fillColor: ACCENT_COLOR, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9.5, cellPadding: 7, valign: 'middle' },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const meta = bodyMeta[data.row.index];
      if (meta?.type === 'data' && meta.compliance === ComplianceStatus.NAO_CONFORME) {
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [153, 27, 27];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 3) return;
      const meta = bodyMeta[data.row.index];
      if (meta?.type === 'data' && meta.compliance) {
        drawStatusIndicator(doc, data.cell, meta.compliance);
      }
    },
  });

  y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 24;

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerTop = pageHeight - 46;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20);
  if (y > footerTop - 60) {
    doc.addPage();
    y = 50;
  }
  doc.text('Comentários sobre os resultados', marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50);
  const commentLines: string[] = doc.splitTextToSize(sanitizePdfText(input.comment || '-'), usableWidth);
  for (const line of commentLines) {
    if (y > footerTop - 14) {
      doc.addPage();
      y = 50;
    }
    doc.text(line, marginX, y);
    y += 14;
  }
  doc.setTextColor(0);

  doc.setDrawColor(225);
  doc.line(marginX, footerTop, pageWidth - marginX, footerTop);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Alvim Análises — Monitoramento Ambiental e Qualidade de Biometano/Biogás', marginX, pageHeight - 30);
  doc.text(`Emitido em ${today}`, marginX, pageHeight - 18);
  doc.setTextColor(0);

  return Buffer.from(doc.output('arraybuffer'));
}
