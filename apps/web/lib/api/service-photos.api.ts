import { ServicePhotoDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const servicePhotosApi = {
  list: (scheduleId: string) =>
    apiClient.get<ServicePhotoDto[]>(`service-executions/schedule/${scheduleId}/photos`),
  upload: (scheduleId: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiClient.postForm<ServicePhotoDto>(
      `service-executions/schedule/${scheduleId}/photos`,
      formData,
    );
  },
  delete: (photoId: string) => apiClient.delete<void>(`service-executions/photos/${photoId}`),
  // Link direto (inline) — mesmo padrão de custody-documents/custody-extractions.
  fileUrl: (photoId: string) => `/api/backend/service-executions/photos/${photoId}/file`,
};
