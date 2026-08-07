// Status "de verdade" mostrado nas listas de Agendamento/Realizados —
// calculado pelo backend a cada resposta (ScheduleDerivedStatusService), não
// guardado no banco. Substitui a exibição do ScheduleStatus bruto (que hoje
// só serve pra cancelar/reativar — ver TECHNICIAN_ALLOWED_TRANSITIONS, sem
// uso real no app ainda) por algo que reflete o que falta fazer.
export type ScheduleDerivedStatus =
  | 'PROGRAMADO'
  | 'AGENDADO'
  | 'AGUARDANDO_INFORMACOES'
  | 'AGUARDANDO_CERTIFICADOS'
  | 'CONCLUIDO'
  | 'CANCELADO';

export const SCHEDULE_DERIVED_STATUS_LABELS_PT: Record<ScheduleDerivedStatus, string> = {
  PROGRAMADO: 'Programado',
  AGENDADO: 'Agendado',
  AGUARDANDO_INFORMACOES: 'Aguardando Informações',
  AGUARDANDO_CERTIFICADOS: 'Aguardando Certificados',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const SCHEDULE_DERIVED_STATUS_COLORS: Record<
  ScheduleDerivedStatus,
  { background: string; text: string }
> = {
  PROGRAMADO: { background: '#ede9fe', text: '#6d28d9' },
  AGENDADO: { background: '#dcfce7', text: '#15803d' },
  AGUARDANDO_INFORMACOES: { background: '#fef9c3', text: '#854d0e' },
  AGUARDANDO_CERTIFICADOS: { background: '#dbeafe', text: '#1d4ed8' },
  CONCLUIDO: { background: '#dcfce7', text: '#15803d' },
  CANCELADO: { background: '#f1f5f9', text: '#475569' },
};
