import { PDFDocument } from 'pdf-lib';

// Junta vários PDFs (um por composto) num único arquivo pra impressão em um
// só gesto — usado pelas cadeias de custódia em branco (ver
// DownloadBlankCustodyChainsUseCase).
export async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  return Buffer.from(bytes);
}

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

// Anexa documentos de tipo misto (PDF ou imagem solta) ao final de um PDF
// base — usado no Relatório de Campo pra juntar as cadeias de custódia já
// aprovadas do serviço (ver FieldReportsService). Cadeia de custódia pode
// ser um PDF gerado pelo fluxo de digitalização OU uma imagem anexada
// direto (ver AttachExistingCustodyDocumentUseCase, que aceita
// application/pdf ou image/*) — imagem vira 1 página nova, centralizada e
// redimensionada pra caber numa folha A4.
export async function appendDocumentsToPdf(
  baseBuffer: Buffer,
  attachments: { buffer: Buffer; mimeType: string }[],
): Promise<Buffer> {
  const merged = await PDFDocument.load(baseBuffer);

  for (const attachment of attachments) {
    if (attachment.mimeType === 'application/pdf') {
      const doc = await PDFDocument.load(attachment.buffer);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
      continue;
    }

    const image =
      attachment.mimeType === 'image/png'
        ? await merged.embedPng(attachment.buffer)
        : await merged.embedJpg(attachment.buffer);
    const scale = Math.min(A4_WIDTH_PT / image.width, A4_HEIGHT_PT / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    const page = merged.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    page.drawImage(image, {
      x: (A4_WIDTH_PT - width) / 2,
      y: (A4_HEIGHT_PT - height) / 2,
      width,
      height,
    });
  }

  const bytes = await merged.save();
  return Buffer.from(bytes);
}
