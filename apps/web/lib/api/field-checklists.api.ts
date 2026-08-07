import { FieldChecklistDto, SaveFieldChecklistPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const fieldChecklistsApi = {
  // null quando o serviço ainda não teve o checklist preenchido.
  get: (scheduleId: string) => apiClient.get<FieldChecklistDto | null>(`field-checklists/${scheduleId}`),
  save: (scheduleId: string, payload: SaveFieldChecklistPayload) =>
    apiClient.put<FieldChecklistDto>(`field-checklists/${scheduleId}`, payload),
};
