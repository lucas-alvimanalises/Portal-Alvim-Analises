import { ContractDto, CreateContractPayload, UpdateContractPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const contractsApi = {
  // clientId: empresa selecionada no seletor do portal (só relevante para papel CLIENT).
  list: (clientId?: string) =>
    apiClient.get<ContractDto[]>(clientId ? `contracts?clientId=${clientId}` : 'contracts'),
  get: (id: string) => apiClient.get<ContractDto>(`contracts/${id}`),
  create: (payload: CreateContractPayload) => apiClient.post<ContractDto>('contracts', payload),
  update: (id: string, payload: UpdateContractPayload) =>
    apiClient.patch<ContractDto>(`contracts/${id}`, payload),
  deactivate: (id: string) => apiClient.delete<ContractDto>(`contracts/${id}`),
};
