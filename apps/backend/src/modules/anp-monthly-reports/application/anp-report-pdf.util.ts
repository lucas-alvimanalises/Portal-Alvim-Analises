import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnpReportResultRow, ComplianceStatus } from '@portal-alvim/shared';
import { getLogoBase64 } from '../../../common/utils/pdf-logo.util';

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ACCENT_COLOR: [number, number, number] = [30, 58, 95];

// Texto fixo, igual em todo reporte gerado (pedido do usuário) — mesmo
// aviso em todo mês/empresa, sem variação nenhuma.
const STANDARD_NOTE_TEXT =
  'Obs: Os resultados acima correspondem aos parâmetros exigidos para anexação no portal da ANP, ' +
  'conforme a Resolução ANP nº 886. Vale destacar que estas não são as únicas análises realizadas ' +
  'mensalmente — a rotina de amostragem inclui também parâmetros complementares voltados à gestão ' +
  'interna da planta e ao comprometimento de atendimento da planilha de monitoramento do HAZOP da ' +
  'qualidade.';

export interface AnpReportPdfInput {
  clientName: string;
  cnpj: string;
  year: number;
  month: number;
  version: number;
  reportNumber: number;
  samplingPointName: string | null;
  technicianNames: string[];
  rows: AnpReportResultRow[];
}

// Um campo "rótulo em cima (cinza, caixa alta) / valor embaixo (preto,
// negrito)" — visual de formulário corporativo, mais fácil de escanear que
// uma lista corrida de "Label: valor". maxWidth quebra o valor em até 2
// linhas (mesmo padrão de results-summary-pdf.util.ts) — sem isso, uma razão
// social longa escrevia por cima do campo ao lado (achado real, ver captura
// enviada pelo usuário): doc.text() sozinho nunca quebra linha.
function drawField(doc: jsPDF, x: number, y: number, label: string, value: string, maxWidth = 220) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  const lines: string[] = doc.splitTextToSize(value, maxWidth).slice(0, 2);
  lines.forEach((line, index) => doc.text(line, x, y + 14 + index * 13));
}

// Layout corporativo pra protocolo na ANP — mesmo esqueleto de
// schedule-pdf.util.ts (jsPDF + jspdf-autotable, logo via
// getLogoBase64()), com a tabela de resultados destacando em vermelho toda
// linha fora do limite regulatório (didParseCell do autoTable).
export function buildAnpReportPdfBuffer(input: AnpReportPdfInput): Buffer {
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
  doc.text('Reporte Mensal ANP', marginX, y);
  y += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(`Monitoramento conforme RANP 886 — ${MONTH_NAMES_PT[input.month - 1]} de ${input.year}`, marginX, y);
  y += 10;

  // Barra de destaque — dá um ar de "timbrado" à seção de título.
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(marginX, y, 64, 3, 'F');
  y += 28;

  // Bloco de dados em cartão (fundo claro, borda sutil) com 2 colunas de
  // campos — muito mais fácil de escanear que 8 linhas corridas.
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

  drawField(doc, col1X, fieldY, 'Mês de referência', MONTH_NAMES_PT[input.month - 1]);
  drawField(doc, col2X, fieldY, 'Ano', String(input.year));
  fieldY += rowHeight;

  drawField(doc, col1X, fieldY, 'Ponto de amostragem', input.samplingPointName ?? '-');
  drawField(
    doc,
    col2X,
    fieldY,
    'Responsável técnico',
    input.technicianNames.length > 0 ? input.technicianNames.join(', ') : '-',
  );
  fieldY += rowHeight;

  drawField(doc, col1X, fieldY, 'Data de emissão', today);
  drawField(
    doc,
    col2X,
    fieldY,
    'Número do reporte',
    `${String(input.reportNumber).padStart(5, '0')} (v${input.version})`,
  );

  doc.setTextColor(0);
  y = cardTop + cardHeight + 30;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Data', 'Parâmetro', 'Resultado', 'Limite Regulatório ANP', 'Nº do Certificado', 'Situação']],
    // Larguras fixas (soma = usableWidth) — sem isso o autoTable dividia o
    // espaço de forma proporcional ao texto mais longo do cabeçalho e
    // "Fora da especificação" estourava pra fora da página numa geração
    // real (ver captura enviada pelo usuário). Coluna "Data" nova (mês pode
    // ter mais de um atendimento — cada linha agora é uma amostra/data, não
    // um parâmetro único). Coluna "Nº do Certificado" (pedido do usuário): o
    // cliente precisa desse número pra anexar o resultado no portal da ANP.
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 115 },
      2: { cellWidth: 85 },
      3: { cellWidth: 95 },
      4: { cellWidth: 75 },
      5: { cellWidth: 90 },
    },
    // Sem emoji aqui: a fonte padrão do jsPDF (helvetica, um Standard-14
    // font sem esses glyphs) derruba a célula inteira quando encontra um
    // caractere fora do WinAnsi — descoberto rodando a geração real e
    // conferindo o texto embutido no PDF (a célula "Situação" das linhas
    // Não Conforme saía em branco/corrompida). O alerta visual já vem do
    // fundo vermelho da linha (didParseCell abaixo); a tela web continua
    // usando 🟢/🔴 normalmente, já que HTML não tem essa limitação de fonte.
    body: input.rows.map((row) => [
      new Date(row.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      row.label,
      row.result,
      `${row.regulatoryLimit.toFixed(2).replace('.', ',')} ${row.unit}`,
      row.certificateNumber ?? '-',
      row.compliance === ComplianceStatus.NAO_CONFORME ? 'Fora da especificação' : 'Conforme',
    ]),
    headStyles: { fillColor: ACCENT_COLOR, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9.5, cellPadding: 7, valign: 'middle' },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = input.rows[data.row.index];
      if (row?.compliance === ComplianceStatus.NAO_CONFORME) {
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [153, 27, 27];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 24;

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerTop = pageHeight - 46;

  // Nota padrão, em verde, embaixo da tabela de resultados — mesmo texto em
  // todo reporte gerado.
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const noteLines: string[] = doc.splitTextToSize(STANDARD_NOTE_TEXT, usableWidth - 24);
  const noteBoxHeight = noteLines.length * 12 + 20;

  if (y + noteBoxHeight > footerTop - 10) {
    doc.addPage();
    y = 50;
  }

  doc.setDrawColor(134, 239, 172);
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(marginX, y, usableWidth, noteBoxHeight, 4, 4, 'FD');
  doc.setTextColor(21, 128, 61);
  noteLines.forEach((line, index) => {
    doc.text(line, marginX + 12, y + 16 + index * 12);
  });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  doc.setDrawColor(225);
  doc.line(marginX, pageHeight - 46, pageWidth - marginX, pageHeight - 46);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Alvim Análises — Monitoramento Ambiental e Qualidade de Biometano/Biogás', marginX, pageHeight - 30);
  doc.text(`Emitido em ${today}`, marginX, pageHeight - 18);
  doc.setTextColor(0);

  return Buffer.from(doc.output('arraybuffer'));
}
