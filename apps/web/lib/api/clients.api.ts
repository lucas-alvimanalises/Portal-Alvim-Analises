import { ClientDto, CreateClientPayload, UpdateClientPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const clientsApi = {
  list: () => apiClient.get<ClientDto[]>('clients'),
  // Empresas que o usuário logado (papel CLIENT) pode acessar.
  mine: () => apiClient.get<ClientDto[]>('clients/me'),
  get: (id: string) => apiClient.get<ClientDto>(`clients/${id}`),
  create: (payload: CreateClientPayload) => apiClient.post<ClientDto>('clients', payload),
  update: (id: string, payload: UpdateClientPayload) =>
    apiClient.patch<ClientDto>(`clients/${id}`, payload),
  deactivate: (id: string) => apiClient.delete<ClientDto>(`clients/${id}`),
};
