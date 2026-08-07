import {
  CreateSchedulePayload,
  ScheduleDto,
  SendScheduleToClientResponse,
  UpdateScheduleCommentsPayload,
  UpdateSchedulePayload,
  UpdateScheduleStatusPayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const schedulesApi = {
  // clientId: empresa selecionada no seletor do portal (só relevante para papel CLIENT).
  list: (clientId?: string) =>
    apiClient.get<ScheduleDto[]>(clientId ? `schedules?clientId=${clientId}` : 'schedules'),
  get: (id: string) => apiClient.get<ScheduleDto>(`schedules/${id}`),
  create: (payload: CreateSchedulePayload) => apiClient.post<ScheduleDto>('schedules', payload),
  update: (id: string, payload: UpdateSchedulePayload) =>
    apiClient.patch<ScheduleDto>(`schedules/${id}`, payload),
  updateStatus: (id: string, payload: UpdateScheduleStatusPayload) =>
    apiClient.patch<ScheduleDto>(`schedules/${id}/status`, payload),
  updateComments: (id: string, payload: UpdateScheduleCommentsPayload) =>
    apiClient.patch<ScheduleDto>(`schedules/${id}/comments`, payload),
  sendToClient: (id: string) =>
    apiClient.post<SendScheduleToClientResponse>(`schedules/${id}/send-to-client`, {}),
};
