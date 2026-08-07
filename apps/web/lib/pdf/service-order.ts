import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientDto, SCHEDULE_STATUS_LABELS_PT, ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';

// A função autoTable(doc, options) seta doc.lastAutoTable internamente
// (via drawTable), mesmo sem chamar applyPlugin — só o tipo jsPDF importado
// não reflete essa propriedade adicionada em tempo de execução.
type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };

function formatDateUTC(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => reject(new Error('Falha ao carregar o logo'));
    img.src = src;
  });
}

// Gera e baixa um PDF de "Ordem de Serviço" no formato usado internamente
// pela Alvim (cliente, tipo de serviço, técnicos e uma tabela por ponto de
// amostragem listando os compostos a coletar e a quantidade de amostras).
export async function generateServiceOrderPdf(schedule: ScheduleDto, client?: ClientDto) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 50;

  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');
    const logoWidth = 150;
    const logoHeight = 108;
    doc.addImage(logoDataUrl, 'JPEG', pageWidth - marginX - logoWidth, 24, logoWidth, logoHeight);
  } catch {
    // Segue sem o logo caso não carregue — não deve impedir a geração do PDF.
  }

  const referenceNumber = String(schedule.orderNumber).padStart(5, '0');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Ordem de Serviço Nº ${referenceNumber}`, marginX, y);
  y += 28;

  const dateRange =
    schedule.endDate && schedule.endDate !== schedule.scheduledDate
      ? `${formatDateUTC(schedule.scheduledDate)} a ${formatDateUTC(schedule.endDate)}`
      : formatDateUTC(schedule.scheduledDate);

  const addressParts = [client?.address, client?.city, client?.state].filter(Boolean).join(', ');

  const lines = [
    `Cliente: ${client?.companyName ?? schedule.clientName ?? '-'}`,
    `CPF/CNPJ: ${client?.cnpj ?? '-'}`,
    `Endereço: ${addressParts || '-'}`,
    `Tipo de Serviço: ${schedule.serviceTypeName ?? '-'}`,
    `Técnico(s): ${schedule.technicians.length > 0 ? schedule.technicians.map((t) => t.name).join(', ') : '-'}`,
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

  if (schedule.samplingPoints.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 16;
    doc.text('Nenhum ponto de amostragem definido para este agendamento.', marginX, y);
  }

  schedule.samplingPoints.forEach((point) => {
    autoTable(doc, {
      startY: y + 6,
      margin: { left: marginX, right: marginX },
      head: [[point.samplingPointName ?? 'Ponto', 'Qtd.']],
      body:
        point.compounds.length > 0
          ? point.compounds.map((c) => [c.name, String(c.quantity)])
          : [['-', '-']],
      headStyles: { fillColor: [210, 210, 210], textColor: 20 },
      styles: { fontSize: 9, cellPadding: 5 },
      theme: 'grid',
    });
    y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y) + 16;
  });

  doc.save(`Ordem_de_Servico_${referenceNumber}.pdf`);
}
