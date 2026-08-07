import { LoginResponse } from '@portal-alvim/shared';
import { apiClient } from './client';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },
  me: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
};
