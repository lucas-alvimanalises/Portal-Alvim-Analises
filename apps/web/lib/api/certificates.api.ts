import {
  CertificateDto,
  CertificateUploadFields,
  UpdateCertificateMetadataPayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

function buildUploadFormData(fields: CertificateUploadFields, file: File) {
  const formData = new FormData();
  formData.set('sampleId', fields.sampleId);
  formData.set('certificateNumber', fields.certificateNumber);
  formData.set('laboratory', fields.laboratory);
  formData.set('analysisDate', fields.analysisDate);
  formData.set('issueDate', fields.issueDate);
  if (fields.responsibleUserId) formData.set('responsibleUserId', fields.responsibleUserId);
  formData.set('file', file);
  return formData;
}

export const certificatesApi = {
  list: (sampleId: string) => apiClient.get<CertificateDto[]>(`certificates?sampleId=${sampleId}`),
  upload: (fields: CertificateUploadFields, file: File) =>
    apiClient.postForm<CertificateDto>('certificates', buildUploadFormData(fields, file)),
  replaceFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiClient.patchForm<CertificateDto>(`certificates/${id}/file`, formData);
  },
  updateMetadata: (id: string, payload: UpdateCertificateMetadataPayload) =>
    apiClient.patch<CertificateDto>(`certificates/${id}`, payload),
  delete: (id: string) => apiClient.delete<void>(`certificates/${id}`),
  // Link direto (não passa por fetch/apiClient): o Content-Disposition do
  // backend já força o download, e cookies httpOnly viajam sozinhos numa
  // navegação same-origin através do proxy.
  downloadUrl: (id: string) => `/api/backend/certificates/${id}/download`,
  // Igual acima, só que direto pela amostra (sem precisar buscar o id do
  // certificado antes) — usado no download em lote de Resultados/Histórico.
  downloadBySampleUrl: (sampleId: string) => `/api/backend/certificates/by-sample/${sampleId}/download`,
};
