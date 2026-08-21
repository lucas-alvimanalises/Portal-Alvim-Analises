import { ScheduleDerivedStatus, ScheduleStatus } from '../enums';

// Ponto de amostragem coberto pela visita + quais compostos serão amostrados nele.
export interface ScheduleSamplingPointDto {
  samplingPointId: string;
  samplingPointName?: string;
  compounds: { id: string; code: string; name: string; quantity: number }[];
}

export interface ScheduleSamplingPointCompoundPayload {
  compoundId: string;
  // Quantas amostras desse composto serão coletadas neste ponto (ex.: 2x Siloxanos).
  quantity: number;
}

export interface ScheduleSamplingPointPayload {
  samplingPointId: string;
  compounds: ScheduleSamplingPointCompoundPayload[];
}

export interface ScheduleTechnicianDto {
  id: string;
  name: string;
}

export interface ScheduleDto {
  id: string;
  // Numeração sequencial da Ordem de Serviço, exibida no PDF gerado.
  orderNumber: number;
  // Opcional: agendamento pode ser feito direto pra empresa, sem contrato.
  contractId: string | null;
  clientId: string;
  clientName?: string;
  serviceTypeId: string;
  serviceTypeName?: string;
  // Serviços podem durar mais de um dia: início e fim (sem horário).
  scheduledDate: string;
  endDate: string | null;
  // false = só se sabe o mês ainda (scheduledDate guarda o dia 1) — vira
  // status "Programado" em vez de "Agendado".
  dateConfirmed: boolean;
  // Um serviço pode precisar de mais de um técnico em campo (N:N).
  technicians: ScheduleTechnicianDto[];
  samplingPoints: ScheduleSamplingPointDto[];
  status: ScheduleStatus;
  // Status "de verdade" mostrado nas telas de Agendamento/Realizados — ver
  // schedule-derived-status.enum.ts e ScheduleDerivedStatusService.
  derivedStatus: ScheduleDerivedStatus;
  // Anotações de campo do técnico — nunca preenchido pra usuários papel
  // CLIENT (redigido pelo backend, ver schedule.mapper.ts), independente do
  // que esteja salvo no banco.
  internalComments: string | null;
  // Texto redigido pela Alvim sobre o serviço, visível ao cliente.
  clientComments: string | null;
  // Resposta do cliente ao comentário acima — só o cliente edita.
  clientResponse: string | null;
  // Código de rastreio dos Correios do envio das amostras pro laboratório
  // parceiro — só a equipe Alvim edita, mas visível a todo mundo (inclusive
  // CLIENT) que enxerga o agendamento.
  trackingCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchedulePayload {
  contractId?: string;
  clientId: string;
  serviceTypeId: string;
  scheduledDate: string;
  endDate?: string;
  // Omitido = true (data certa). false = só o mês é conhecido ainda.
  dateConfirmed?: boolean;
  technicianIds: string[];
  samplingPoints?: ScheduleSamplingPointPayload[];
  // true quando o usuário já viu o aviso de manutenção programada na mesma
  // data e confirmou "Agendar mesmo assim" (ver PlantMaintenance/checkConflicts
  // no backend) — sem isso, um conflito bloqueia a criação/edição.
  overrideMaintenanceWarning?: boolean;
}

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

export interface UpdateScheduleCommentsPayload {
  internalComments?: string;
  clientComments?: string;
  clientResponse?: string;
  trackingCode?: string;
}

export interface UpdateScheduleStatusPayload {
  status: ScheduleStatus;
}

export interface SendScheduleToClientResponse {
  sentTo: string[];
}
