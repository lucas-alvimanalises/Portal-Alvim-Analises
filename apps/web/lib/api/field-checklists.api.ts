import {
  ChecklistSectionDto,
  CreateChecklistItemPayload,
  FieldChecklistDto,
  SaveFieldChecklistPayload,
  UpdateChecklistItemPayload,
} from '@portal-alvim/shared';
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
  // Catálogo de seções/itens (editável pelo portal — ver "+ Adicionar item").
  listSections: () => apiClient.get<ChecklistSectionDto[]>('field-checklists/sections'),
  createItem: (sectionId: string, payload: CreateChecklistItemPayload) =>
    apiClient.post(`field-checklists/sections/${sectionId}/items`, payload),
  updateItem: (itemId: string, payload: UpdateChecklistItemPayload) =>
    apiClient.patch(`field-checklists/items/${itemId}`, payload),
};
