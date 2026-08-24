import { UserDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const usersApi = {
  list: async () => {
    const { data } = await apiClient.get<UserDto[]>('/users');
    return data;
  },
};
