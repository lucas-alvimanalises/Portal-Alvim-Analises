import {
  CreateSamplePayload,
  PendingCertificateDto,
  ReplaceSampleResultRowsPayload,
  SampleDto,
  UpdateSamplePayload,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const samplesApi = {
  // clientId: empresa selecionada no seletor do portal (papel CLIENT);
  // compoundId: filtro da "pasta" de composto na tela de Amostras;
  // scheduleId: filtro por agendamento na tela de Resultados Analíticos.
  list: (params?: {
    clientId?: string;
    compoundId?: string;
    scheduleId?: string;
    samplingPointId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.clientId) query.set('clientId', params.clientId);
    if (params?.compoundId) query.set('compoundId', params.compoundId);
    if (params?.scheduleId) query.set('scheduleId', params.scheduleId);
    if (params?.samplingPointId) query.set('samplingPointId', params.samplingPointId);
    const qs = query.toString();
    return apiClient.get<SampleDto[]>(qs ? `samples?${qs}` : 'samples');
  },
  get: (id: string) => apiClient.get<SampleDto>(`samples/${id}`),
  create: (payload: CreateSamplePayload) => apiClient.post<SampleDto>('samples', payload),
  update: (id: string, payload: UpdateSamplePayload) =>
    apiClient.patch<SampleDto>(`samples/${id}`, payload),
  deactivate: (id: string) => apiClient.delete<SampleDto>(`samples/${id}`),
  replaceResultRows: (id: string, payload: ReplaceSampleResultRowsPayload) =>
    apiClient.put<SampleDto>(`samples/${id}/results`, payload),
  listPendingCertificates: () => apiClient.get<PendingCertificateDto[]>('samples/pending-certificates'),
};
