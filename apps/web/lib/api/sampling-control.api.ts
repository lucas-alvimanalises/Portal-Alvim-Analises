import {
  ListSamplingControlParams,
  SamplingControlRecordDto,
  UpdateSamplingControlRecordPayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

function buildQuery(params: ListSamplingControlParams): string {
  const query = new URLSearchParams();
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.clientId) query.set('clientId', params.clientId);
  if (params.compoundName) query.set('compoundName', params.compoundName);
  if (params.source) query.set('source', params.source);
  if (params.search) query.set('search', params.search);
  return query.toString();
}

export const samplingControlApi = {
  list: (params: ListSamplingControlParams = {}) => {
    const qs = buildQuery(params);
    return apiClient.get<SamplingControlRecordDto[]>(
      qs ? `sampling-control?${qs}` : 'sampling-control',
    );
  },
  update: (id: string, payload: UpdateSamplingControlRecordPayload) =>
    apiClient.patch<SamplingControlRecordDto>(`sampling-control/${id}`, payload),
  // URL pronta pra window.open — Content-Disposition: attachment já força o
  // download (mesmo padrão de samplesApi.exportExcelUrl).
  exportExcelUrl: (params: ListSamplingControlParams = {}) => {
    const qs = buildQuery(params);
    return `/api/backend/sampling-control/export${qs ? `?${qs}` : ''}`;
  },
};
