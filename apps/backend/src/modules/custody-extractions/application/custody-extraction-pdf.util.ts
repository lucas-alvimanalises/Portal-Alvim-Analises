import { jsPDF } from 'jspdf';
import autoTable, { CellHookData, RowInput } from 'jspdf-autotable';
import { CustodyExtractedData, CustodyTemplateField, CustodyTemplateSchema } from '@portal-alvim/shared';
import { getLogoBase64 } from '../../../common/utils/pdf-logo.util';

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

// Campos de data são digitados via <input type="date"> (valor sempre
// "AAAA-MM-DD", independente do locale do navegador) — convertidos aqui pro
// formato brasileiro (DD/MM/AAAA) só na hora de gerar o PDF.
function formatFieldValue(field: CustodyTemplateField, rawValue: string): string {
  if (field.type !== 'date' || !rawValue) return rawValue;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(rawValue);
  if (!match) return rawValue;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function fieldValue(field: CustodyTemplateField, data: CustodyExtractedData): string {
  return formatFieldValue(field, data.fields[field.key]?.value ?? '');
}

export interface CustodyDocumentPhoto {
  buffer: Buffer;
  mimeType: string;
}

function imageFormatFromMimeType(mimeType: string): string {
  if (mimeType.includes('png')) return 'PNG';
  if (mimeType.includes('webp')) return 'WEBP';
  return 'JPEG';
}

// Tamanho fixo (largura = conteúdo inteiro, altura máxima 260pt) pra a foto
// entrar sempre do mesmo jeito no documento ("de forma homogênea"),
// preservando a proporção original em vez de esticar.
const PHOTO_MAX_HEIGHT = 260;

// Colunas do modelo em Excel oficial ("11000 - Cadeia de custódia Silox
// (MODELO DE CAMPO).xlsx"): A = rótulo (largura 58.66 de um total de
// 126.3 ≈ 46,4%), B–E = área de valor (as outras 4 colunas, ≈13,4% cada) —
// mesclada numa célula só pra a maioria dos campos, mas dividida em 4
// células de verdade só nas linhas da tabela de amostragem (impingers).
// Sem preenchimento de cor em lugar nenhum do modelo — só bordas finas
// pretas em toda célula.
const LABEL_WIDTH_RATIO = 0.464;

// Reproduz célula por célula o modelo em branco oficial da Alvim: logo +
// cabeçalho de controle de documento (Responsável/Emissão/Revisão), linha
// de identificação (relatório de campo/composto/data), e uma única tabela
// contínua de campos onde a tabela de amostragem é só um trecho com a área
// de valor dividida em 4 colunas em vez de mesclada — sem cabeçalho A/B/C/
// Branco e sem preenchimento cinza, que não existem no modelo original.
export function buildCustodyDocumentPdfBuffer(
  compoundName: string,
  schema: CustodyTemplateSchema,
  data: CustodyExtractedData,
  photo?: CustodyDocumentPhoto,
  signature?: CustodyDocumentPhoto,
): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  const labelWidth = contentWidth * LABEL_WIDTH_RATIO;
  const valueColWidth = (contentWidth - labelWidth) / 4;
  let y = 40;

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', marginX, y, 60, 44);
  }

  // Encolhe a fonte do título até caber no espaço antes da tabela de
  // Responsável/Emissão/Revisão (evita sobrepor em compostos com nome longo).
  const docControlWidth = 260;
  const titleText = `CADEIA DE CUSTÓDIA ${compoundName.toUpperCase()}`;
  const titleX = marginX + 70;
  const titleMaxWidth = pageWidth - marginX - docControlWidth - titleX - 10;
  doc.setFont('helvetica', 'bold');
  let titleFontSize = 14;
  doc.setFontSize(titleFontSize);
  while (titleFontSize > 6 && doc.getTextWidth(titleText) > titleMaxWidth) {
    titleFontSize -= 1;
    doc.setFontSize(titleFontSize);
  }
  doc.text(titleText, titleX, y + 26);

  const meta = schema.documentMeta;
  const docControlHead = ['Responsável', 'Emissão'];
  const docControlBody = [meta.responsavel, meta.emissao];
  if (meta.revisaoLabel) {
    docControlHead.push(meta.revisaoLabel);
    docControlBody.push(meta.revisaoData ?? '');
  }
  autoTable(doc, {
    startY: y,
    margin: { left: pageWidth - marginX - docControlWidth, right: marginX },
    tableWidth: docControlWidth,
    head: [docControlHead],
    body: [docControlBody],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.75 },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: 'normal' },
  });

  y = Math.max(y + 55, ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 15);

  const reportField = schema.fields.find((field) => field.key === schema.topRowFieldKeys.reportNumber);
  const dateField = schema.fields.find((field) => field.key === schema.topRowFieldKeys.date);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  const reportValue = reportField ? fieldValue(reportField, data) : '';
  const dateValue = dateField ? fieldValue(dateField, data) : '';
  doc.text(`relatorio de campo nº ${reportValue}`, marginX, y);
  doc.text(compoundName, pageWidth / 2 - 30, y);
  doc.text(`DATA ${dateValue}`, pageWidth - marginX - 120, y);
  y += 16;

  const bodyFields = schema.fields.filter(
    (field) => field.key !== schema.topRowFieldKeys.reportNumber && field.key !== schema.topRowFieldKeys.date,
  );

  // Uma linha por campo simples (rótulo + valor mesclado nas 4 colunas de
  // valor); no ponto marcado por `tableInsertAfterKey`, insere as linhas da
  // tabela de amostragem com a área de valor dividida em 4 células reais —
  // tudo dentro da MESMA tabela contínua, igual ao Excel original.
  const rows: RowInput[] = [];
  // Índice da linha do campo de assinatura dentro de `rows` (se o template
  // tiver um) — usado no hook didDrawCell abaixo pra sobrepor a imagem da
  // assinatura na célula de valor certa, já que autoTable não tem um jeito
  // nativo de colocar imagem dentro de uma célula de texto.
  let signatureRowIndex: number | null = null;
  bodyFields.forEach((field) => {
    rows.push([field.label, { content: fieldValue(field, data), colSpan: 4 }]);
    if (schema.signatureFieldKey && field.key === schema.signatureFieldKey) {
      signatureRowIndex = rows.length - 1;
    }
    if (schema.tableInsertAfterKey && field.key === schema.tableInsertAfterKey) {
      schema.table.rows.forEach((row) => {
        rows.push([
          row.label,
          ...schema.table.columns.map((column) => data.table[column]?.[row.key]?.value ?? ''),
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 6, lineColor: [0, 0, 0], lineWidth: 0.75 },
    columnStyles: {
      0: { fontStyle: 'bold', fontSize: 9, cellWidth: labelWidth },
      1: { cellWidth: valueColWidth },
      2: { cellWidth: valueColWidth },
      3: { cellWidth: valueColWidth },
      4: { cellWidth: valueColWidth },
    },
    bodyStyles: { fontStyle: 'italic' },
    didDrawCell: (hookData: CellHookData) => {
      if (
        !signature ||
        signatureRowIndex === null ||
        hookData.section !== 'body' ||
        hookData.row.index !== signatureRowIndex ||
        hookData.column.index !== 1
      ) {
        return;
      }

      const { x, y: cellY, width, height } = hookData.cell;
      const format = imageFormatFromMimeType(signature.mimeType);
      const props = doc.getImageProperties(signature.buffer);
      const padding = 3;
      const scale = Math.min(
        (width - padding * 2) / props.width,
        (height - padding * 2) / props.height,
      );
      const imgWidth = props.width * scale;
      const imgHeight = props.height * scale;
      const imgX = x + (width - imgWidth) / 2;
      const imgY = cellY + (height - imgHeight) / 2;
      doc.addImage(signature.buffer, format, imgX, imgY, imgWidth, imgHeight);
    },
  });

  if (photo) {
    let photoY = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const labelHeight = 22;
    // Abaixo desse tamanho a foto fica pequena demais pra servir de
    // referência visual — melhor quebrar página do que espremer além disso.
    const MIN_PHOTO_HEIGHT = 90;

    const format = imageFormatFromMimeType(photo.mimeType);
    const props = doc.getImageProperties(photo.buffer);

    // Tenta caber a foto no espaço que sobrou nesta página (documento
    // inteiro numa folha A4 só, pra impressão) — só quebra página se não
    // sobrar espaço nem pro tamanho mínimo legível.
    let maxPhotoHeight = Math.min(PHOTO_MAX_HEIGHT, pageHeight - marginX - photoY - labelHeight);
    if (maxPhotoHeight < MIN_PHOTO_HEIGHT) {
      doc.addPage();
      photoY = marginX;
      maxPhotoHeight = PHOTO_MAX_HEIGHT;
    }

    const scale = Math.min(contentWidth / props.width, maxPhotoHeight / props.height);
    const photoWidth = props.width * scale;
    const photoHeight = props.height * scale;
    const photoX = marginX + (contentWidth - photoWidth) / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Foto do serviço', marginX, photoY);
    doc.addImage(photo.buffer, format, photoX, photoY + 8, photoWidth, photoHeight);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
