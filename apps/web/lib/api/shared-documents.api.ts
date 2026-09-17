import { SharedDocumentDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const sharedDocumentsApi = {
  list: (clientId?: string) =>
    apiClient.get<SharedDocumentDto[]>(`shared-documents${clientId ? `?clientId=${clientId}` : ''}`),
  upload: (clientId: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiClient.postForm<SharedDocumentDto>(`shared-documents/${clientId}`, formData);
  },
  remove: (id: string) => apiClient.delete<void>(`shared-documents/${id}`),
  fileUrl: (id: string) => `/api/backend/shared-documents/${id}/file`,
};
