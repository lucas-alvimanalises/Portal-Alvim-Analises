import { MaintenanceNature, MaintenanceStatus } from '../enums';

export interface PlantMaintenanceAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}

export interface PlantMaintenanceDto {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: MaintenanceStatus;
  nature: MaintenanceNature;
  // Chaves de MAINTENANCE_TYPE_OPTIONS (constants) — "outro" (se marcado)
  // some junto aqui, com o texto livre em otherType.
  types: string[];
  otherType: string | null;
  objectives: string[];
  otherObjective: string | null;
  description: string;
  createdById: string;
  createdByName: string;
  attachments: PlantMaintenanceAttachmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlantMaintenancePayload {
  clientId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status?: MaintenanceStatus;
  nature: MaintenanceNature;
  types: string[];
  otherType?: string;
  objectives: string[];
  otherObjective?: string;
  description: string;
}

export type UpdatePlantMaintenancePayload = Partial<Omit<CreatePlantMaintenancePayload, 'clientId'>>;

export interface PlantMaintenanceFilters {
  clientId: string;
  year?: number;
  month?: number;
  type?: string;
  status?: MaintenanceStatus;
}

// Devolvido por GET /plant-maintenances/conflicts — usado pelo ScheduleForm
// pra avisar antes de agendar um serviço numa data com manutenção
// programada/em andamento (ver MAINTENANCE_BLOCKING_STATUSES).
export interface MaintenanceConflictDto {
  id: string;
  date: string;
  nature: MaintenanceNature;
  types: string[];
  description: string;
}
