import {
  ListSamplingControlParams,
  SamplingControlRecordDto,
  UpdateSamplingControlRecordPayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

function buildQuery(params: ListSamplingControlParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  return query.toString();
}

export const samplingControlApi = {
  // A tabela inteira numa consulta só — filtros são aplicados no cliente
  // (ver matchesSamplingControlFilters em @portal-alvim/shared).
  list: () => apiClient.get<SamplingControlRecordDto[]>('sampling-control'),
  update: (id: string, payload: UpdateSamplingControlRecordPayload) =>
    apiClient.patch<SamplingControlRecordDto>(`sampling-control/${id}`, payload),
  // URL pronta pra window.open — Content-Disposition: attachment já força o
  // download (mesmo padrão de samplesApi.exportExcelUrl).
  exportExcelUrl: (params: ListSamplingControlParams = {}) => {
    const qs = buildQuery(params);
    return `/api/backend/sampling-control/export${qs ? `?${qs}` : ''}`;
  },
};
