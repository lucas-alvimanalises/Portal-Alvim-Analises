import { NotificationDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const notificationsApi = {
  list: async () => {
    const { data } = await apiClient.get<NotificationDto[]>('/notifications');
    return data;
  },
  unreadCount: async () => {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },
  markRead: async (id: string) => {
    const { data } = await apiClient.patch<NotificationDto>(`/notifications/${id}/read`);
    return data;
  },
  markAllRead: async () => {
    await apiClient.patch('/notifications/read-all');
  },
};
