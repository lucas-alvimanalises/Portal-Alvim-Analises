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
  servicePreview: (scheduleId: string) =>
    apiClient.get<ServiceLabelsPreviewResponse>(`labels/service-preview?scheduleId=${scheduleId}`),
  serviceConfirm: (scheduleId: string) =>
    apiClient.post<ServiceLabelsPreviewResponse>('labels/service-confirm', { scheduleId }),
};
