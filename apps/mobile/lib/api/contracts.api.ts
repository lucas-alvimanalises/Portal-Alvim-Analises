import { ContractDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const contractsApi = {
  list: async () => {
    const { data } = await apiClient.get<ContractDto[]>('/contracts');
    return data;
  },
};
