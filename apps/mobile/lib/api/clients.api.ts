import { ClientDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const clientsApi = {
  list: async () => {
    const { data } = await apiClient.get<ClientDto[]>('/clients');
    return data;
  },
};
