import {
  CreatePlantMaintenancePayload,
  MaintenanceConflictDto,
  PlantMaintenanceDto,
  PlantMaintenanceFilters,
  UpdatePlantMaintenancePayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

function buildQuery(filters: PlantMaintenanceFilters): string {
  const params = new URLSearchParams();
  params.set('clientId', filters.clientId);
  if (filters.year) params.set('year', String(filters.year));
  if (filters.month) params.set('month', String(filters.month));
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

export const plantMaintenancesApi = {
  list: (filters: PlantMaintenanceFilters) =>
    apiClient.get<PlantMaintenanceDto[]>(`plant-maintenances?${buildQuery(filters)}`),
  get: (id: string) => apiClient.get<PlantMaintenanceDto>(`plant-maintenances/${id}`),
  create: (payload: CreatePlantMaintenancePayload) =>
    apiClient.post<PlantMaintenanceDto>('plant-maintenances', payload),
  update: (id: string, payload: UpdatePlantMaintenancePayload) =>
    apiClient.patch<PlantMaintenanceDto>(`plant-maintenances/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`plant-maintenances/${id}`),
  uploadAttachment: (id: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiClient.postForm<PlantMaintenanceDto>(`plant-maintenances/${id}/attachments`, formData);
  },
  removeAttachment: (attachmentId: string) =>
    apiClient.delete<void>(`plant-maintenances/attachments/${attachmentId}`),
  attachmentFileUrl: (attachmentId: string) =>
    `/api/backend/plant-maintenances/attachments/${attachmentId}/file`,
  // Checagem antecipada usada pelo ScheduleForm antes de submeter — o
  // bloqueio de verdade é feito pelo backend em CreateScheduleUseCase/
  // UpdateScheduleUseCase, isso aqui é só pra mostrar o aviso antes.
  checkConflicts: (clientId: string, startDate: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.set('clientId', clientId);
    params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiClient.get<MaintenanceConflictDto[]>(`plant-maintenances/conflicts?${params.toString()}`);
  },
};
