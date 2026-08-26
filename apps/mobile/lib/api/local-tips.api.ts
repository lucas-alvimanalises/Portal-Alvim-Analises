import { CreateLocalTipPayload, LocalTipDto, UpdateLocalTipPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const localTipsApi = {
  listByClient: async (clientId: string) => {
    const { data } = await apiClient.get<LocalTipDto[]>(`/local-tips/${clientId}`);
    return data;
  },
  create: async (payload: CreateLocalTipPayload) => {
    const { data } = await apiClient.post<LocalTipDto>('/local-tips', payload);
    return data;
  },
  update: async (id: string, payload: UpdateLocalTipPayload) => {
    const { data } = await apiClient.patch<LocalTipDto>(`/local-tips/${id}`, payload);
    return data;
  },
  remove: async (id: string) => {
    await apiClient.delete(`/local-tips/${id}`);
  },
};
