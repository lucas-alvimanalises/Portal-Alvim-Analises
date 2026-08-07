import { CertificateExtractedData, CertificateExtractionDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const certificateExtractionsApi = {
  listBySample: (sampleId: string) =>
    apiClient.get<CertificateExtractionDto[]>(`certificate-extractions?sampleId=${sampleId}`),
  get: (id: string) => apiClient.get<CertificateExtractionDto>(`certificate-extractions/${id}`),
  upload: (sampleId: string, file: File) => {
    const formData = new FormData();
    formData.set('sampleId', sampleId);
    formData.set('file', file);
    return apiClient.postForm<CertificateExtractionDto>('certificate-extractions', formData);
  },
  updateCorrections: (id: string, correctedData: CertificateExtractedData) =>
    apiClient.patch<CertificateExtractionDto>(`certificate-extractions/${id}`, { correctedData }),
  approve: (id: string) => apiClient.post<CertificateExtractionDto>(`certificate-extractions/${id}/approve`),
  delete: (id: string) => apiClient.delete<void>(`certificate-extractions/${id}`),
  // Link direto pro certificado original (PDF/imagem inline no navegador).
  scanUrl: (id: string) => `/api/backend/certificate-extractions/${id}/scan`,
};
