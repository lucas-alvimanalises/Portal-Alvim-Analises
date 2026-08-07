import {
  CreateSamplingPointPayload,
  SamplingPointDto,
  UpdateSamplingPointPayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const samplingPointsApi = {
  listByClient: (clientId: string) =>
    apiClient.get<SamplingPointDto[]>(`sampling-points?clientId=${clientId}`),
  create: (payload: CreateSamplingPointPayload) =>
    apiClient.post<SamplingPointDto>('sampling-points', payload),
  update: (id: string, payload: UpdateSamplingPointPayload) =>
    apiClient.patch<SamplingPointDto>(`sampling-points/${id}`, payload),
  deactivate: (id: string) => apiClient.delete<SamplingPointDto>(`sampling-points/${id}`),
};
