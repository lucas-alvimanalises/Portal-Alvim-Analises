import { CreateLocalTipPayload, LocalTipDto, UpdateLocalTipPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const localTipsApi = {
  listByClient: (clientId: string) => apiClient.get<LocalTipDto[]>(`local-tips/${clientId}`),
  // { [clientId]: quantidade } — usado pela lista de nível 1 (/dicas-locais).
  counts: () => apiClient.get<Record<string, number>>('local-tips/counts'),
  create: (payload: CreateLocalTipPayload) => apiClient.post<LocalTipDto>('local-tips', payload),
  update: (id: string, payload: UpdateLocalTipPayload) =>
    apiClient.patch<LocalTipDto>(`local-tips/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`local-tips/${id}`),
};
