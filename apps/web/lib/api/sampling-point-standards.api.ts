import { SamplingPointStandardDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const samplingPointStandardsApi = {
  list: () => apiClient.get<SamplingPointStandardDto[]>('sampling-point-standards'),
};
