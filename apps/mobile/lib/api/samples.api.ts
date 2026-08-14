import { CreateSamplePayload, SampleDto, UpdateSamplePayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const samplesApi = {
  listByClient: async (clientId: string) => {
    const { data } = await apiClient.get<SampleDto[]>(`/samples?clientId=${clientId}`);
    return data;
  },
  listBySchedule: async (scheduleId: string) => {
    const { data } = await apiClient.get<SampleDto[]>(`/samples?scheduleId=${scheduleId}`);
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<SampleDto>(`/samples/${id}`);
    return data;
  },
  create: async (payload: CreateSamplePayload) => {
    const { data } = await apiClient.post<SampleDto>('/samples', payload);
    return data;
  },
  update: async (id: string, payload: UpdateSamplePayload) => {
    const { data } = await apiClient.patch<SampleDto>(`/samples/${id}`, payload);
    return data;
  },
};
