import { Client } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SCHEDULE_STATUS_LABELS_PT, ScheduleStatus } from '@portal-alvim/shared';
import { getLogoBase64 } from '../../../common/utils/pdf-logo.util';
import { ScheduleWithRelations } from '../domain/schedule.repository';

// autoTable(doc, options) seta doc.lastAutoTable internamente (via drawTable)
// mesmo sem chamar applyPlugin — só o tipo jsPDF não reflete essa propriedade
// adicionada em tempo de execução. Mesma abordagem usada em apps/web.
type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

function formatDateUTC(date: Date) {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Mesmo layout do PDF gerado no browser (apps/web/lib/pdf/service-order.ts),
// reimplementado aqui para o envio por e-mail server-side — sem DOM/canvas,
// o logo é lido direto do disco em base64.
export function buildServiceOrderPdfBuffer(schedule: ScheduleWithRelations, client: Client): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 50;

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    const logoWidth = 150;
    const logoHeight = 108;
    doc.addImage(logoBase64, 'JPEG', pageWidth - marginX - logoWidth, 24, logoWidth, logoHeight);
  }

  const referenceNumber = String(schedule.orderNumber).padStart(5, '0');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Ordem de Serviço Nº ${referenceNumber}`, marginX, y);
  y += 28;

  const dateRange =
    schedule.endDate && schedule.endDate.getTime() !== schedule.scheduledDate.getTime()
      ? `${formatDateUTC(schedule.scheduledDate)} a ${formatDateUTC(schedule.endDate)}`
      : formatDateUTC(schedule.scheduledDate);

  const addressParts = [client.address, client.city, client.state].filter(Boolean).join(', ');
  const technicianNames = schedule.technicians?.map((t) => t.technician.name) ?? [];

  const lines = [
    `Cliente: ${client.companyName}`,
    `CPF/CNPJ: ${client.cnpj}`,
    `Endereço: ${addressParts || '-'}`,
    `Tipo de Serviço: ${schedule.serviceType?.name ?? '-'}`,
    `Técnico(s): ${technicianNames.length > 0 ? technicianNames.join(', ') : '-'}`,
    `Situação: ${SCHEDULE_STATUS_LABELS_PT[schedule.status as ScheduleStatus]}`,
    `Data Agendada: ${dateRange}`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  lines.forEach((line) => {
    doc.text(line, marginX, y);
    y += 16;
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Pontos de Coleta', marginX, y);
  y += 10;

  const samplingPoints = schedule.samplingPoints ?? [];

  if (samplingPoints.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 16;
    doc.text('Nenhum ponto de amostragem definido para este agendamento.', marginX, y);
  }

  samplingPoints.forEach((point) => {
    autoTable(doc, {
      startY: y + 6,
      margin: { left: marginX, right: marginX },
      head: [[point.samplingPoint.name, 'Qtd.']],
      body:
        point.compounds.length > 0
          ? point.compounds.map((c) => [c.compound.name, String(c.quantity)])
          : [['-', '-']],
      headStyles: { fillColor: [210, 210, 210], textColor: 20 },
      styles: { fontSize: 9, cellPadding: 5 },
      theme: 'grid',
    });
    y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 16;
  });

  return Buffer.from(doc.output('arraybuffer'));
}
