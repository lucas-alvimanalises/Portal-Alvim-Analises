import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  ListSamplingControlParams,
  SAMPLING_CONTROL_SOURCE_LABELS_PT,
  SamplingControlSource,
} from '@portal-alvim/shared';
import { getLogoBase64 } from '../../common/utils/pdf-logo.util';
import { SamplingControlService } from './sampling-control.service';

const BRAND_GREEN = 'FF1F5F4D';
const BRAND_GREEN_LIGHT = 'FF2F7A63';
const ZEBRA_FILL = 'FFF3F5F4';
const THIN_BORDER: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD5DAD9' } };

export interface ExportedFile {
  buffer: Buffer;
  filename: string;
}

function sanitizeFilenamePart(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDateUtc(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Exportação em Excel da "Tabela de Controle de Amostras" — sob demanda,
// gerada na hora (sem persistir), mesmo padrão visual do export do Histórico
// (ExportSamplesExcelUseCase): faixa da marca, logo, zebra, autoFilter.
@Injectable()
export class SamplingControlExcelService {
  constructor(private readonly samplingControlService: SamplingControlService) {}

  async export(params: ListSamplingControlParams): Promise<ExportedFile> {
    const records = await this.samplingControlService.list(params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Alvim Análises';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Controle de Amostras', { views: [{ showGridLines: false }] });

    const columnDefs = [
      { key: 'serviceDate', header: 'Data do Serviço', width: 15 },
      { key: 'clientName', header: 'Cliente', width: 28 },
      { key: 'compoundName', header: 'Amostragem', width: 18 },
      { key: 'sampleIdentification', header: 'Identificação da Amostra', width: 26 },
      { key: 'fieldReportNumber', header: 'N° Relatório Interno', width: 18 },
      { key: 'pump', header: 'Bomba Utilizada', width: 16 },
      { key: 'samplingPointName', header: 'Ponto de Amostragem', width: 24 },
      { key: 'observation', header: 'Observação', width: 34 },
      { key: 'billingResponsible', header: 'Responsável pelo Faturamento', width: 32 },
      { key: 'source', header: 'Origem', width: 18 },
    ];
    sheet.columns = columnDefs.map(({ key, width }) => ({ key, width }));
    const lastColLetter = String.fromCharCode('A'.charCodeAt(0) + columnDefs.length - 1);

    // Linha 1: logo isolada em fundo branco (o JPEG tem retângulo branco, não
    // pode ficar sobre a faixa verde).
    sheet.getRow(1).height = 54;
    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      const imageId = workbook.addImage({ base64: `data:image/jpeg;base64,${logoBase64}`, extension: 'jpeg' });
      sheet.addImage(imageId, { tl: { col: 0.1, row: 0.08 }, ext: { width: 96, height: 70 } });
    }

    // Linha 2: faixa de título.
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const titleCell = sheet.getCell('A2');
    titleCell.value = 'Tabela de Controle de Amostras — Alvim Análises';
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', indent: 1 };
    sheet.getRow(2).height = 30;
    sheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GREEN } };

    // Linha 3: subtítulo com data/hora e o período filtrado (se houver).
    const periodLabel =
      params.startDate || params.endDate
        ? ` · Período: ${params.startDate ? formatDateUtc(params.startDate) : 'início'} a ${params.endDate ? formatDateUtc(params.endDate) : 'hoje'}`
        : '';
    sheet.mergeCells(`A3:${lastColLetter}3`);
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = `Gerado em ${new Date().toLocaleString('pt-BR')} · ${records.length} amostragem(ns)${periodLabel}`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    subtitleCell.alignment = { indent: 1 };
    sheet.getRow(3).height = 18;

    sheet.getRow(4).height = 8; // espaçador

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
    for (const record of records) {
      const excelRow = sheet.addRow({
        serviceDate: formatDateUtc(record.serviceDate),
        clientName: record.clientName,
        compoundName: record.compoundName,
        sampleIdentification: record.sampleIdentification ?? '',
        fieldReportNumber: record.fieldReportNumber ?? '',
        pump: record.pump ?? '',
        samplingPointName: record.samplingPointName ?? '',
        observation: record.observation ?? '',
        billingResponsible: record.billingResponsible ?? '',
        source: SAMPLING_CONTROL_SOURCE_LABELS_PT[record.source as SamplingControlSource],
      });
      dataRowCount++;
      const zebra = dataRowCount % 2 === 0;
      excelRow.eachCell((cell) => {
        cell.border = { bottom: THIN_BORDER };
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_FILL } };
      });
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const datePart = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `controle-de-amostras-${sanitizeFilenamePart(datePart)}.xlsx` };
  }
}
