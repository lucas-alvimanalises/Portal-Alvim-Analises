import {
  CustodyDocumentDto,
  CustodyDocumentsDedupeResult,
  CustodyDocumentsSyncResult,
  CustodyDocumentUploadFields,
} from '@portal-alvim/shared';
import { apiClient } from './client';

function buildUploadFormData(fields: CustodyDocumentUploadFields, file: File) {
  const formData = new FormData();
  formData.set('compoundId', fields.compoundId);
  formData.set('year', String(fields.year));
  formData.set('file', file);
  return formData;
}

export const custodyDocumentsApi = {
  list: (compoundId?: string) =>
    apiClient.get<CustodyDocumentDto[]>(
      compoundId ? `custody-documents?compoundId=${compoundId}` : 'custody-documents',
    ),
  upload: (fields: CustodyDocumentUploadFields, file: File) =>
    apiClient.postForm<CustodyDocumentDto>('custody-documents', buildUploadFormData(fields, file)),
  delete: (id: string) => apiClient.delete<void>(`custody-documents/${id}`),
  // Botão "Atualizar pastas" — varre a pasta local do OneDrive configurada
  // no backend e sobe qualquer PDF novo (período de transição).
  sync: () => apiClient.post<CustodyDocumentsSyncResult>('custody-documents/sync'),
  // Botão "Remover duplicatas" — só remove o padrão seguro (órfã + vinculada
  // repetida), o resto volta pra revisão manual (ver skippedGroups).
  dedupe: () => apiClient.post<CustodyDocumentsDedupeResult>('custody-documents/dedupe'),
  // Links diretos (não passam por fetch/apiClient): cookies httpOnly viajam
  // sozinhos numa navegação same-origin através do proxy.
  downloadUrl: (id: string) => `/api/backend/custody-documents/${id}/download`,
  // Content-Disposition: inline no backend — o navegador renderiza o PDF
  // na aba em vez de baixar, pra visualizar sem sair da plataforma.
  viewUrl: (id: string) => `/api/backend/custody-documents/${id}/view`,
};
