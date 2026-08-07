import { ServiceTypeDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const serviceTypesApi = {
  list: () => apiClient.get<ServiceTypeDto[]>('service-types'),
};
