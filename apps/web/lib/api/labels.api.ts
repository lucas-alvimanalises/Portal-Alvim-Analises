import {
  PreviewLabelsResponse,
  PrintedLabelDto,
  PrintLabelsPayload,
  ServiceLabelsPreviewResponse,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const labelsApi = {
  // Só leitura — nunca reserva número, seguro pra chamar toda vez que a
  // tela abre/atualiza (ver LabelsService).
  preview: (payload: PrintLabelsPayload) =>
    apiClient.get<PreviewLabelsResponse>(
      `labels/preview?scheduleId=${payload.scheduleId}&compoundId=${payload.compoundId}`,
    ),
  // Consome a sequência de verdade — só chamar no clique de "Imprimir".
  // Idempotente: reimprimir o mesmo agendamento+composto reaproveita os
  // números já atribuídos em vez de gerar novos.
  confirm: (payload: PrintLabelsPayload) =>
    apiClient.post<PrintedLabelDto[]>('labels/confirm', payload),
  // "Imprimir Etiquetas Serviço" — todos os grupos de etiqueta do
  // agendamento (Siloxanos/Compostos Sulfurados/VOCs) de uma vez.
  // excludeCodes tira compostos opcionais (ver VOCS_LABEL_CODE) que o
  // usuário decidiu não imprimir desta vez.
  servicePreview: (scheduleId: string, excludeCodes: string[] = []) => {
    const query = new URLSearchParams({ scheduleId });
    if (excludeCodes.length) query.set('excludeCodes', excludeCodes.join(','));
    return apiClient.get<ServiceLabelsPreviewResponse>(`labels/service-preview?${query.toString()}`);
  },
  serviceConfirm: (scheduleId: string, excludeCodes: string[] = []) =>
    apiClient.post<ServiceLabelsPreviewResponse>('labels/service-confirm', { scheduleId, excludeCodes }),
};
