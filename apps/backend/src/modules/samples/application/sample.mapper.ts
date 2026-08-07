import { SampleDto } from '@portal-alvim/shared';
import { SampleWithRelations } from '../domain/sample.repository';

export function toSampleDto(sample: SampleWithRelations): SampleDto {
  return {
    id: sample.id,
    clientId: sample.clientId,
    clientName: sample.client?.companyName,
    scheduleId: sample.scheduleId,
    scheduleDate: sample.schedule?.scheduledDate.toISOString(),
    samplingPointId: sample.samplingPointId,
    samplingPointName: sample.samplingPoint?.name,
    compoundId: sample.compoundId,
    compoundCode: sample.compound?.code,
    compoundName: sample.compound?.name,
    collectionDate: sample.collectionDate.toISOString(),
    collectionLocation: sample.collectionLocation,
    responsibleUserId: sample.responsibleUserId,
    responsibleUserName: sample.responsibleUser?.name,
    analysisType: sample.analysisType,
    notes: sample.notes,
    active: sample.active,
    sampleCode: sample.sampleCode,
    analysisStatus: sample.analysisStatus as SampleDto['analysisStatus'],
    resultRows: (sample.resultRows ?? []).map((row) => ({
      id: row.id,
      parameterName: row.parameterName,
      result: row.result,
      unit: row.unit,
      specLimit: row.specLimit,
      compliance: row.compliance as SampleDto['resultRows'][number]['compliance'],
      notes: row.notes,
      order: row.order,
    })),
    createdAt: sample.createdAt.toISOString(),
    updatedAt: sample.updatedAt.toISOString(),
  };
}
