import { ChecklistSectionDto, FieldChecklistDto, SaveFieldChecklistPayload } from '@portal-alvim/shared';
import { apiClient, API_URL } from './client';
import { MobileUploadFile } from './service-photos.api';

export const fieldChecklistsApi = {
  // Catálogo de seções/itens — editável só pelo portal web; o app só lê.
  listSections: async () => {
    const { data } = await apiClient.get<ChecklistSectionDto[]>('field-checklists/sections');
    return data;
  },
  // null quando o serviço ainda não teve o checklist preenchido nem anexado.
  get: async (scheduleId: string) => {
    const { data } = await apiClient.get<FieldChecklistDto | null>(`field-checklists/${scheduleId}`);
    return data;
  },
  save: async (scheduleId: string, payload: SaveFieldChecklistPayload) => {
    const { data } = await apiClient.put<FieldChecklistDto>(`field-checklists/${scheduleId}`, payload);
    return data;
  },
  // Foto do checklist preenchido no papel — quem prefere papel imprime o
  // modelo em branco (pelo portal web), preenche à mão e fotografa aqui.
  uploadAttachment: async (scheduleId: string, file: MobileUploadFile) => {
    const formData = new FormData();
    // @ts-expect-error RN FormData aceita { uri, name, type } em vez de Blob
    formData.append('file', file);
    const { data } = await apiClient.post<FieldChecklistDto>(
      `field-checklists/${scheduleId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
  deleteAttachment: (attachmentId: string) =>
    apiClient.delete<void>(`field-checklists/attachments/${attachmentId}`),
  // URL direta do arquivo (usar com header de autenticação em
  // Image source={{ uri, headers }}).
  attachmentFileUrl: (attachmentId: string) =>
    `${API_URL}/field-checklists/attachments/${attachmentId}/file`,
};
