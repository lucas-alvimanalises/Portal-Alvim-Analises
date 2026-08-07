export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const SCHEDULE_STATUS_LABELS_PT: Record<ScheduleStatus, string> = {
  [ScheduleStatus.SCHEDULED]: 'Agendado',
  [ScheduleStatus.CONFIRMED]: 'Confirmado',
  [ScheduleStatus.IN_TRANSIT]: 'Em deslocamento',
  [ScheduleStatus.IN_PROGRESS]: 'Em execução',
  [ScheduleStatus.COMPLETED]: 'Finalizado',
  [ScheduleStatus.CANCELLED]: 'Cancelado',
};

// Transições permitidas por papel — usado tanto no backend (validação) quanto no front (UI).
export const TECHNICIAN_ALLOWED_TRANSITIONS: Record<ScheduleStatus, ScheduleStatus[]> = {
  [ScheduleStatus.SCHEDULED]: [ScheduleStatus.CONFIRMED],
  [ScheduleStatus.CONFIRMED]: [ScheduleStatus.IN_TRANSIT],
  [ScheduleStatus.IN_TRANSIT]: [ScheduleStatus.IN_PROGRESS],
  [ScheduleStatus.IN_PROGRESS]: [ScheduleStatus.COMPLETED],
  [ScheduleStatus.COMPLETED]: [],
  [ScheduleStatus.CANCELLED]: [],
};
