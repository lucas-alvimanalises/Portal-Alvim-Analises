import { CustodyExtractedData, CustodyExtractionDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const custodyExtractionsApi = {
  listBySample: (sampleId: string) =>
    apiClient.get<CustodyExtractionDto[]>(`custody-extractions?sampleId=${sampleId}`),
  get: (id: string) => apiClient.get<CustodyExtractionDto>(`custody-extractions/${id}`),
  upload: (sampleId: string, file: File) => {
    const formData = new FormData();
    formData.set('sampleId', sampleId);
    formData.set('file', file);
    return apiClient.postForm<CustodyExtractionDto>('custody-extractions', formData);
  },
  createManual: (sampleId: string) =>
    apiClient.post<CustodyExtractionDto>('custody-extractions/manual', { sampleId }),
  // Cadeia de custódia já pronta (feita fora da plataforma, ex.: backlog de
  // serviços antigos) — anexa o arquivo direto como documento oficial, sem
  // IA nem revisão (ver AttachExistingCustodyDocumentUseCase).
  attachExisting: (sampleId: string, file: File) => {
    const formData = new FormData();
    formData.set('sampleId', sampleId);
    formData.set('file', file);
    return apiClient.postForm<CustodyExtractionDto>('custody-extractions/attach-existing', formData);
  },
  updateCorrections: (id: string, correctedData: CustodyExtractedData) =>
    apiClient.patch<CustodyExtractionDto>(`custody-extractions/${id}`, { correctedData }),
  selectPhoto: (id: string, photoId: string | null) =>
    apiClient.patch<CustodyExtractionDto>(`custody-extractions/${id}/photo`, { photoId }),
  approve: (id: string) => apiClient.post<CustodyExtractionDto>(`custody-extractions/${id}/approve`),
  delete: (id: string) => apiClient.delete<void>(`custody-extractions/${id}`),
  // Link direto pra tela de conferência (imagem/PDF inline no navegador).
  scanUrl: (id: string) => `/api/backend/custody-extractions/${id}/scan`,
  // PDF de cadeia de custódia já aprovado, direto pela amostra (sem precisar
  // descobrir o id da extração antes) — usado no download em lote de
  // Resultados/Histórico, inclusive por CLIENT (ver
  // DownloadCustodyDocumentBySampleUseCase, diferente de custody-documents
  // que é ADMIN/MANAGER só).
  downloadBySampleUrl: (sampleId: string) =>
    `/api/backend/custody-extractions/by-sample/${sampleId}/document`,
  // Cadeias de custódia em branco (um PDF só, uma página por composto do
  // agendamento) pra levar a campo — ver "Organizar Serviço".
  downloadBlankUrl: (scheduleId: string) => `/api/backend/custody-extractions/blank/${scheduleId}`,
};
