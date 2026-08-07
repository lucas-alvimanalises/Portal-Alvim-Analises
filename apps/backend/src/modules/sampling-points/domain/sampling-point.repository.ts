import { SamplingPoint } from '@prisma/client';

export interface CreateSamplingPointData {
  clientId: string;
  name: string;
  standardId?: string;
}

export type UpdateSamplingPointData = Partial<Omit<CreateSamplingPointData, 'clientId'>> & {
  active?: boolean;
};

export type SamplingPointWithStandard = SamplingPoint & {
  standard?: { name: string } | null;
};

export const SAMPLING_POINT_REPOSITORY = Symbol('SAMPLING_POINT_REPOSITORY');

export interface SamplingPointRepository {
  findById(id: string): Promise<SamplingPointWithStandard | null>;
  findManyByClient(clientId: string): Promise<SamplingPointWithStandard[]>;
  create(data: CreateSamplingPointData): Promise<SamplingPointWithStandard>;
  update(id: string, data: UpdateSamplingPointData): Promise<SamplingPointWithStandard>;
  deactivate(id: string): Promise<SamplingPointWithStandard>;
}
