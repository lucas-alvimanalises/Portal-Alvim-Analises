import {
  GenerateServiceResultsSummaryPayload,
  ServiceResultsSummaryDto,
  ServiceResultsSummaryLatestDto,
  ServiceResultsSummaryPreviewDto,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const serviceResultsSummaryApi = {
  getPreview: (scheduleId: string) =>
    apiClient.get<ServiceResultsSummaryPreviewDto>(`service-results-summary/${scheduleId}/preview`),
  listVersions: (scheduleId: string) =>
    apiClient.get<ServiceResultsSummaryDto[]>(`service-results-summary/${scheduleId}/versions`),
  // Alimenta o indicador da tabela de Realizados — uma query só pra todos os
  // serviços visíveis, não N chamadas.
  listLatestByScheduleIds: (scheduleIds: string[]) =>
    scheduleIds.length === 0
      ? Promise.resolve([] as ServiceResultsSummaryLatestDto[])
      : apiClient.get<ServiceResultsSummaryLatestDto[]>(
          `service-results-summary/latest?scheduleIds=${scheduleIds.join(',')}`,
        ),
  generate: (scheduleId: string, payload: GenerateServiceResultsSummaryPayload) =>
    apiClient.post<ServiceResultsSummaryDto>(`service-results-summary/${scheduleId}/generate`, payload),
  // Link direto (inline) — mesmo padrão de custody-documents/anp-monthly-reports/field-reports.
  fileUrl: (id: string) => `/api/backend/service-results-summary/reports/${id}/file`,
};
