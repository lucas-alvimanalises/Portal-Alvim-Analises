import { ScheduleDto } from '@portal-alvim/shared';
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
};
