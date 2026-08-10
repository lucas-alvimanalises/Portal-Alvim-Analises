import { ServicePhotoDto } from '@portal-alvim/shared';
import { apiClient } from './client';

// Upload multipart no RN não usa File (não existe) — o objeto
// { uri, name, type } é a convenção aceita pelo FormData/Axios no Expo.
export interface MobileUploadFile {
  uri: string;
  name: string;
  type: string;
}

export const servicePhotosApi = {
  list: async (scheduleId: string) => {
    const { data } = await apiClient.get<ServicePhotoDto[]>(
      `service-executions/schedule/${scheduleId}/photos`,
    );
    return data;
  },
  upload: async (scheduleId: string, file: MobileUploadFile) => {
    const formData = new FormData();
    // @ts-expect-error RN FormData aceita { uri, name, type } em vez de Blob
    formData.append('file', file);
    const { data } = await apiClient.post<ServicePhotoDto>(
      `service-executions/schedule/${scheduleId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
  delete: (photoId: string) => apiClient.delete<void>(`service-executions/photos/${photoId}`),
  // URL direta do arquivo (com header de autenticação — ver uso em Image
  // source={{ uri, headers }} na tela de detalhe do serviço).
  fileUrl: (photoId: string, baseUrl: string) =>
    `${baseUrl}/service-executions/photos/${photoId}/file`,
};
