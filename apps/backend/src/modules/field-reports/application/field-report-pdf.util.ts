import { jsPDF } from 'jspdf';
import { getLogoBase64 } from '../../../common/utils/pdf-logo.util';

export interface FieldReportPhoto {
  // Base64 puro, sem prefixo "data:...;base64," — mesmo padrão de
  // getLogoBase64().
  base64: string;
  format: 'JPEG' | 'PNG';
}

export interface FieldReportPdfInput {
  clientName: string;
  // Já formatado ("04/08/2026" ou "04/08/2026 a 05/08/2026").
  formattedDate: string;
  introParagraph: string;
  summaryParagraph: string;
  closingParagraph: string;
  // Já na ordem de exibição, no máx. 4 (validado pelo FieldReportsService).
  photos: FieldReportPhoto[];
}

// Layout fixo, baseado no relatório de campo em Word que a Alvim já usa
// manualmente (RANP 1006 → resumo do serviço → responsabilização/fechamento
// → grade de fotos 2x2) — mesmo esqueleto de jsPDF de
// schedules/application/schedule-pdf.util.ts (logo via getLogoBase64(),
// unit 'pt'/format 'a4'), só que aqui com parágrafos corridos em vez de
// tabela.
export function buildFieldReportPdfBuffer(input: FieldReportPdfInput): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginBottom = 50;
  const usableWidth = pageWidth - marginX * 2;
  let y = 50;

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    const logoWidth = 110;
    const logoHeight = 80;
    doc.addImage(logoBase64, 'JPEG', pageWidth - marginX - logoWidth, 24, logoWidth, logoHeight);
    y = Math.max(y, 24 + logoHeight + 16);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const title = `Relatório de Campo ${input.formattedDate} ${input.clientName}`;
  const titleLines: string[] = doc.splitTextToSize(title, usableWidth);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += titleLines.length * 18 + 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const paragraphs = [input.introParagraph, input.summaryParagraph, input.closingParagraph];
  paragraphs.forEach((paragraph) => {
    const lines: string[] = doc.splitTextToSize(paragraph, usableWidth);
    lines.forEach((line) => {
      if (y > pageHeight - marginBottom) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, marginX, y);
      y += 16;
    });
    y += 12;
  });

  if (input.photos.length > 0) {
    const DEFAULT_PHOTO_SIZE = 180;
    // Abaixo disso a foto fica pequena demais pra servir de evidência —
    // só nesse ponto desiste de caber na página 1 e pula pra página 2.
    const MIN_PHOTO_SIZE = 110;
    const gap = 20;
    const columns = Math.min(2, input.photos.length);
    const rows = Math.ceil(input.photos.length / 2);
    const gridHeightFor = (size: number) => rows * size + (rows - 1) * gap;

    let photoSize = DEFAULT_PHOTO_SIZE;
    const available = pageHeight - marginBottom - y - 10;

    // Serviços com mais pontos de amostragem geram um resumo mais longo,
    // que empurra "y" mais pra baixo — em vez de jogar a grade inteira pra
    // uma página 2 (achado real: Relatório de Campo da Orizon/Jaboatão,
    // 5 pontos, resumo bem mais longo que o normal), primeiro tenta
    // diminuir a foto pra caber no que sobrou da página 1.
    if (gridHeightFor(photoSize) > available) {
      const fitted = (available - (rows - 1) * gap) / rows;
      photoSize = Math.min(DEFAULT_PHOTO_SIZE, fitted);
    }

    if (photoSize < MIN_PHOTO_SIZE) {
      doc.addPage();
      y = 50;
      photoSize = DEFAULT_PHOTO_SIZE;
    }

    const gridWidth = columns * photoSize + (columns - 1) * gap;
    const gridHeight = gridHeightFor(photoSize);
    const startX = marginX + (usableWidth - gridWidth) / 2;
    y += 10;

    input.photos.forEach((photo, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * (photoSize + gap);
      const photoY = y + row * (photoSize + gap);
      doc.addImage(photo.base64, photo.format, x, photoY, photoSize, photoSize);
    });
    y += gridHeight;
  }

  // Rodapé em todas as páginas (o texto pode empurrar pra uma 2ª página).
  const totalPages = doc.getNumberOfPages();
  const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Emissão do relatório: ${today}`, marginX, pageHeight - 24);
    doc.setTextColor(0);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
