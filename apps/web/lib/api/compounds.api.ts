import { CompoundDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const compoundsApi = {
  list: () => apiClient.get<CompoundDto[]>('compounds'),
};
