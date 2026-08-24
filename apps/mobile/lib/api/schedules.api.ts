import { ScheduleDto, UpdateScheduleCommentsPayload, UpdateSchedulePayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const schedulesApi = {
  list: async () => {
    const { data } = await apiClient.get<ScheduleDto[]>('/schedules');
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<ScheduleDto>(`/schedules/${id}`);
    return data;
  },
  update: async (id: string, payload: UpdateSchedulePayload) => {
    const { data } = await apiClient.patch<ScheduleDto>(`/schedules/${id}`, payload);
    return data;
  },
  updateComments: async (id: string, payload: UpdateScheduleCommentsPayload) => {
    const { data } = await apiClient.patch<ScheduleDto>(`/schedules/${id}/comments`, payload);
    return data;
  },
};
