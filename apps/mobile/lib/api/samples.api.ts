import { SampleDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const samplesApi = {
  listByClient: async (clientId: string) => {
    const { data } = await apiClient.get<SampleDto[]>(`/samples?clientId=${clientId}`);
    return data;
  },
};
