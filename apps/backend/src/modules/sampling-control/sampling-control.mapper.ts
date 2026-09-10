import { SamplingControlRecord } from '@prisma/client';
import { SamplingControlRecordDto, SamplingControlSource } from '@portal-alvim/shared';

// "AAAA-MM-DD" em UTC — data sem horário (mesmo padrão de Sample.collectionDate
// e do restante do portal), pra não deslocar um dia no fuso de quem consome.
function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toSamplingControlRecordDto(row: SamplingControlRecord): SamplingControlRecordDto {
  return {
    id: row.id,
    serviceDate: toDateOnly(row.serviceDate),
    clientName: row.clientName,
    clientId: row.clientId,
    compoundName: row.compoundName,
    sampleIdentification: row.sampleIdentification,
    fieldReportNumber: row.fieldReportNumber,
    pump: row.pump,
    samplingPointName: row.samplingPointName,
    observation: row.observation,
    billingResponsible: row.billingResponsible,
    source: row.source as SamplingControlSource,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
