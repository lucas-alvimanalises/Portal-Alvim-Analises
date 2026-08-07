export enum MaintenanceNature {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  INSPECTION = 'INSPECTION',
  CALIBRATION = 'CALIBRATION',
  REPLACEMENT = 'REPLACEMENT',
  CLEANING = 'CLEANING',
  OPERATIONAL_ADJUSTMENT = 'OPERATIONAL_ADJUSTMENT',
}

export const MAINTENANCE_NATURE_LABELS_PT: Record<MaintenanceNature, string> = {
  [MaintenanceNature.PREVENTIVE]: 'Preventiva',
  [MaintenanceNature.CORRECTIVE]: 'Corretiva',
  [MaintenanceNature.EMERGENCY]: 'Emergencial',
  [MaintenanceNature.INSPECTION]: 'Inspeção',
  [MaintenanceNature.CALIBRATION]: 'Calibração',
  [MaintenanceNature.REPLACEMENT]: 'Substituição',
  [MaintenanceNature.CLEANING]: 'Limpeza',
  [MaintenanceNature.OPERATIONAL_ADJUSTMENT]: 'Ajuste Operacional',
};
