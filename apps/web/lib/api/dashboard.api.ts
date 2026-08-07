import { apiClient } from './client';

export interface DashboardSummary {
  activeClients: number;
  scheduledThisMonth: number;
  // Indicadores de Manutenção da Planta (Fase 2 do módulo).
  maintenancesScheduledThisMonth: number;
  maintenancesInProgress: number;
}

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>('dashboard/summary'),
};
