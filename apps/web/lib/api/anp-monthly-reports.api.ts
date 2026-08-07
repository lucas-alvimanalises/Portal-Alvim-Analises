import {
  AnpDashboardComplianceDto,
  AnpEligibleClientDto,
  AnpModuleSummaryDto,
  AnpMonthBadgeDto,
  AnpMonthDetailDto,
  AnpMonthlyReportDto,
  AnpRegulatoryLimitDto,
  UpdateAnpRegulatoryLimitsPayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const anpMonthlyReportsApi = {
  listEligibleClients: () => apiClient.get<AnpEligibleClientDto[]>('anp-monthly-reports/eligible-clients'),
  getSummary: () => apiClient.get<AnpModuleSummaryDto>('anp-monthly-reports/summary'),
  // Usado pelo bloco "Compliance do mês" do Dashboard (ver
  // AnpMonthlyReportsService.getComplianceOverview).
  getDashboardCompliance: () =>
    apiClient.get<AnpDashboardComplianceDto>('anp-monthly-reports/dashboard-compliance'),
  listMonths: (clientId: string) =>
    apiClient.get<AnpMonthBadgeDto[]>(`anp-monthly-reports/${clientId}/months`),
  getMonth: (clientId: string, year: number, month: number) =>
    apiClient.get<AnpMonthDetailDto>(`anp-monthly-reports/${clientId}/${year}/${month}`),
  generate: (clientId: string, year: number, month: number) =>
    apiClient.post<AnpMonthlyReportDto>(`anp-monthly-reports/${clientId}/${year}/${month}/generate`),
  deleteVersion: (reportId: string) => apiClient.delete<void>(`anp-monthly-reports/reports/${reportId}`),
  // Link direto (inline) — mesmo padrão de custody-documents/field-reports.
  fileUrl: (reportId: string) => `/api/backend/anp-monthly-reports/reports/${reportId}/file`,
  getRegulatoryLimits: () =>
    apiClient.get<AnpRegulatoryLimitDto[]>('anp-monthly-reports/regulatory-limits'),
  updateRegulatoryLimits: (items: UpdateAnpRegulatoryLimitsPayload) =>
    apiClient.patch<AnpRegulatoryLimitDto[]>('anp-monthly-reports/regulatory-limits', { items }),
};
