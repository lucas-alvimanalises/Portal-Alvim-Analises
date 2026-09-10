import { FieldChecklistDto, SaveFieldChecklistPayload } from '@portal-alvim/shared';
import { apiClient } from './client';

export const fieldChecklistsApi = {
  // null quando o serviço ainda não teve o checklist preenchido nem anexado.
  get: (scheduleId: string) => apiClient.get<FieldChecklistDto | null>(`field-checklists/${scheduleId}`),
  save: (scheduleId: string, payload: SaveFieldChecklistPayload) =>
    apiClient.put<FieldChecklistDto>(`field-checklists/${scheduleId}`, payload),
  // PDF do checklist em branco (modelo Alvim, cabeçalho já com cliente/
  // serviço/data) — URL pronta pra window.open.
  blankUrl: (scheduleId: string) => `/api/backend/field-checklists/${scheduleId}/blank`,
  // Anexa foto/PDF do checklist preenchido no papel.
  uploadAttachment: (scheduleId: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiClient.postForm<FieldChecklistDto>(
      `field-checklists/${scheduleId}/attachments`,
      formData,
    );
  },
  attachmentFileUrl: (attachmentId: string) =>
    `/api/backend/field-checklists/attachments/${attachmentId}/file`,
  deleteAttachment: (attachmentId: string) =>
    apiClient.delete<{ success: true }>(`field-checklists/attachments/${attachmentId}`),
};
