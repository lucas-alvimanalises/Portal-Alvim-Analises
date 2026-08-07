import { SamplingPointDto } from '@portal-alvim/shared';
import { SamplingPointWithStandard } from '../domain/sampling-point.repository';

export function toSamplingPointDto(point: SamplingPointWithStandard): SamplingPointDto {
  return {
    id: point.id,
    clientId: point.clientId,
    name: point.name,
    standardId: point.standardId,
    standardName: point.standard?.name,
    active: point.active,
    createdAt: point.createdAt.toISOString(),
    updatedAt: point.updatedAt.toISOString(),
  };
}
