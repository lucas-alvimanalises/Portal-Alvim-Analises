import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FIELD_CHECKLIST_SECTIONS } from '@portal-alvim/shared';
import { getLogoBase64 } from '../../common/utils/pdf-logo.util';

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

export interface FieldChecklistPdfHeader {
  clientName: string;
  serviceTypeName: string;
  scheduledDate: string; // AAAA-MM-DD
}

// Formata "AAAA-MM-DD" como "DD/MM/AAAA" (sem depender de fuso).
function formatDate(dateOnly: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOnly);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : dateOnly;
}

// Check List de Material de Campo em branco, no modelo Alvim — pra o
// colaborador que prefere preencher no papel imprimir, marcar as
// quantidades à mão e depois anexar a foto/PDF de volta no portal (ver
// FieldChecklistsService). Conteúdo vem de FIELD_CHECKLIST_SECTIONS, a mesma
// fonte da tela — nunca sai do sincronismo.
export function buildBlankFieldChecklistPdf(header: FieldChecklistPdfHeader): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 36;

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', marginX, y, 58, 42);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CHECK LIST DE MATERIAL DE CAMPO', marginX + 68, y + 22);

  y += 52;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Cliente: ${header.clientName}`, marginX, y);
  doc.text(`Serviço: ${header.serviceTypeName}`, marginX, y + 12);
  doc.text(`Data: ${formatDate(header.scheduledDate)}`, pageWidth - marginX - 120, y);
  y += 24;

  // Duas colunas de seções lado a lado pra caber melhor no papel.
  const gap = 16;
  const colWidth = (pageWidth - marginX * 2 - gap) / 2;
  const columnTops = [y, y];
  const columnX = [marginX, marginX + colWidth + gap];

  FIELD_CHECKLIST_SECTIONS.forEach((section, index) => {
    const col = index % 2;
    autoTable(doc, {
      startY: columnTops[col],
      margin: { left: columnX[col] },
      tableWidth: colWidth,
      head: [['Qtd.', section.label]],
      body: section.items.map((item) => ['', item.label]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 3, lineColor: [120, 120, 120], lineWidth: 0.5 },
      headStyles: { fillColor: [31, 95, 77], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 34, halign: 'center' } },
    });
    columnTops[col] = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? columnTops[col]) + 14;
  });

  let footerY = Math.max(columnTops[0], columnTops[1]) + 6;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (footerY > pageHeight - 60) {
    doc.addPage();
    footerY = 60;
  }
  doc.setFontSize(9);
  doc.text('Preenchido por: ______________________________', marginX, footerY);
  doc.text('Data: ____ / ____ / ______', marginX, footerY + 18);
  doc.text('Assinatura: ______________________________', pageWidth - marginX - 220, footerY + 18);

  return Buffer.from(doc.output('arraybuffer'));
}
