import { FieldChecklistDto, SaveFieldChecklistPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const fieldChecklistsApi = {
  // null quando o serviço ainda não teve o checklist preenchido.
  get: async (scheduleId: string) => {
    const { data } = await apiClient.get<FieldChecklistDto | null>(`field-checklists/${scheduleId}`);
    return data;
  },
  save: async (scheduleId: string, payload: SaveFieldChecklistPayload) => {
    const { data } = await apiClient.put<FieldChecklistDto>(`field-checklists/${scheduleId}`, payload);
    return data;
  },
};
