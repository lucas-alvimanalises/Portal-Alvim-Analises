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

// Distribui as seções entre as 2 colunas pra deixá-las o mais parecidas
// possível em altura (cada seção vai pra coluna mais curta no momento) —
// evita uma coluna gigante que estoura pra a página 2 sem necessidade. O
// "peso" de cada seção é o nº de itens + 1 (linha de cabeçalho).
function balanceSectionsIntoColumns(): (typeof FIELD_CHECKLIST_SECTIONS)[number][][] {
  const columns: (typeof FIELD_CHECKLIST_SECTIONS)[number][][] = [[], []];
  const rowCount = [0, 0];
  // Maiores primeiro: colocar a maior seção sozinha e ir preenchendo com as
  // menores equilibra bem melhor do que a ordem natural (senão a última
  // seção grande, "Material Auxiliar", desbalanceia tudo).
  const sorted = [...FIELD_CHECKLIST_SECTIONS].sort((a, b) => b.items.length - a.items.length);
  for (const section of sorted) {
    const col = rowCount[0] <= rowCount[1] ? 0 : 1;
    columns[col].push(section);
    rowCount[col] += section.items.length + 1;
  }
  return columns;
}

// Check List de Material de Campo em branco, no modelo Alvim — pra o
// colaborador que prefere preencher no papel imprimir, marcar as
// quantidades à mão e depois anexar a foto/PDF de volta no portal (ver
// FieldChecklistsService). Conteúdo vem de FIELD_CHECKLIST_SECTIONS, a mesma
// fonte da tela — nunca sai do sincronismo. Layout apertado de propósito
// pra caber tudo numa folha A4; só vai pra página 2 se o total de itens
// crescer a ponto de não caber mesmo (o jsPDF-autotable pagina sozinho).
export function buildBlankFieldChecklistPdf(header: FieldChecklistPdfHeader): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 32;

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', marginX, y, 50, 37);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CHECK LIST DE MATERIAL DE CAMPO', marginX + 60, y + 20);

  y += 42;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Cliente: ${header.clientName}`, marginX, y);
  doc.text(`Data: ${formatDate(header.scheduledDate)}`, pageWidth - marginX - 110, y);
  doc.text(`Serviço: ${header.serviceTypeName}`, marginX, y + 11);
  y += 20;

  const gap = 16;
  const colWidth = (pageWidth - marginX * 2 - gap) / 2;
  const columnX = [marginX, marginX + colWidth + gap];
  const columnTops = [y, y];
  const columns = balanceSectionsIntoColumns();

  columns.forEach((sections, col) => {
    for (const section of sections) {
      autoTable(doc, {
        startY: columnTops[col],
        margin: { left: columnX[col], right: pageWidth - columnX[col] - colWidth },
        tableWidth: colWidth,
        head: [['Qtd.', section.label]],
        body: section.items.map((item) => ['', item.label]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.8, lineColor: [120, 120, 120], lineWidth: 0.4 },
        headStyles: { fillColor: [31, 95, 77], textColor: 255, fontStyle: 'bold', cellPadding: 2.2 },
        columnStyles: { 0: { cellWidth: 30, halign: 'center' } },
      });
      columnTops[col] = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? columnTops[col]) + 9;
    }
  });

  let footerY = Math.max(columnTops[0], columnTops[1]) + 8;
  if (footerY > pageHeight - 44) {
    doc.addPage();
    footerY = 48;
  }
  doc.setFontSize(9);
  doc.text('Preenchido por: ______________________________', marginX, footerY);
  doc.text('Data: ____ / ____ / ______', marginX, footerY + 16);
  doc.text('Assinatura: ______________________________', pageWidth - marginX - 220, footerY + 16);

  return Buffer.from(doc.output('arraybuffer'));
}
