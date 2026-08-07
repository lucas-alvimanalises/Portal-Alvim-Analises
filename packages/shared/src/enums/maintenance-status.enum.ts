export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const MAINTENANCE_STATUS_LABELS_PT: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.SCHEDULED]: 'Programada',
  [MaintenanceStatus.IN_PROGRESS]: 'Em andamento',
  [MaintenanceStatus.COMPLETED]: 'Concluída',
  [MaintenanceStatus.CANCELLED]: 'Cancelada',
};

// Status que ainda bloqueiam agendamento na mesma data (ver
// PlantMaintenancesService.checkConflicts) — só o que ainda vai acontecer
// ou está acontecendo; concluído/cancelado não bloqueia mais nada.
export const MAINTENANCE_BLOCKING_STATUSES: MaintenanceStatus[] = [
  MaintenanceStatus.SCHEDULED,
  MaintenanceStatus.IN_PROGRESS,
];
