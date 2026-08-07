import { FieldReportDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const fieldReportsApi = {
  // null se ainda não foi gerado — é isso que decide se o relatório aparece
  // pro CLIENT (ver resultados/page.tsx).
  get: (scheduleId: string) => apiClient.get<FieldReportDto | null>(`field-reports/${scheduleId}`),
  generate: (scheduleId: string, photoIds: string[]) =>
    apiClient.post<FieldReportDto>(`field-reports/${scheduleId}/generate`, { photoIds }),
  // Link direto (inline) — mesmo padrão de custody-documents/anp-monthly-reports.
  fileUrl: (scheduleId: string) => `/api/backend/field-reports/${scheduleId}/file`,
};
