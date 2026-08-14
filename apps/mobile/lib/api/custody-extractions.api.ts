import { CustodyExtractedData, CustodyExtractionDto } from '@portal-alvim/shared';
import { apiClient, API_URL } from './client';
import { MobileUploadFile } from './service-photos.api';

export const custodyExtractionsApi = {
  listBySample: async (sampleId: string) => {
    const { data } = await apiClient.get<CustodyExtractionDto[]>(
      `/custody-extractions?sampleId=${sampleId}`,
    );
    return data;
  },
  get: async (id: string) => {
    const { data } = await apiClient.get<CustodyExtractionDto>(`/custody-extractions/${id}`);
    return data;
  },
  // Fotografia/imagem da cadeia de custódia física — a IA lê os campos e o
  // status vai pra NEEDS_REVIEW (ou FAILED se não conseguir ler nada).
  upload: async (sampleId: string, file: MobileUploadFile) => {
    const formData = new FormData();
    formData.append('sampleId', sampleId);
    // @ts-expect-error RN FormData aceita { uri, name, type } em vez de Blob
    formData.append('file', file);
    const { data } = await apiClient.post<CustodyExtractionDto>('/custody-extractions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  // Sem escaneado nenhum — abre direto na tela de conferência com os campos
  // em branco pra preencher manualmente.
  createManual: async (sampleId: string) => {
    const { data } = await apiClient.post<CustodyExtractionDto>('/custody-extractions/manual', {
      sampleId,
    });
    return data;
  },
  updateCorrections: async (id: string, correctedData: CustodyExtractedData) => {
    const { data } = await apiClient.patch<CustodyExtractionDto>(`/custody-extractions/${id}`, {
      correctedData,
    });
    return data;
  },
  selectPhoto: async (id: string, photoId: string | null) => {
    const { data } = await apiClient.patch<CustodyExtractionDto>(`/custody-extractions/${id}/photo`, {
      photoId,
    });
    return data;
  },
  approve: async (id: string) => {
    const { data } = await apiClient.post<CustodyExtractionDto>(`/custody-extractions/${id}/approve`);
    return data;
  },
  delete: (id: string) => apiClient.delete<void>(`/custody-extractions/${id}`),
  // URL do escaneado original (imagem/PDF) — com header de autenticação, ver
  // uso em Image source={{ uri, headers }}.
  scanUrl: (id: string) => `${API_URL}/custody-extractions/${id}/scan`,
};
