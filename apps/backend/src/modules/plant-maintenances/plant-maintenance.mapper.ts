import { MaintenanceNature, MaintenanceStatus, PlantMaintenanceDto } from '@portal-alvim/shared';

type MaintenanceWithRelations = {
  id: string;
  clientId: string;
  client: { companyName: string };
  date: Date;
  startTime: string | null;
  endTime: string | null;
  status: string;
  nature: string;
  types: string[];
  otherType: string | null;
  objectives: string[];
  otherObjective: string | null;
  description: string;
  createdById: string;
  createdBy: { name: string };
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: { name: string };
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

export function toPlantMaintenanceDto(maintenance: MaintenanceWithRelations): PlantMaintenanceDto {
  return {
    id: maintenance.id,
    clientId: maintenance.clientId,
    clientName: maintenance.client.companyName,
    date: maintenance.date.toISOString(),
    startTime: maintenance.startTime,
    endTime: maintenance.endTime,
    status: maintenance.status as MaintenanceStatus,
    nature: maintenance.nature as MaintenanceNature,
    types: maintenance.types,
    otherType: maintenance.otherType,
    objectives: maintenance.objectives,
    otherObjective: maintenance.otherObjective,
    description: maintenance.description,
    createdById: maintenance.createdById,
    createdByName: maintenance.createdBy.name,
    attachments: maintenance.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedByName: attachment.uploadedBy.name,
      createdAt: attachment.createdAt.toISOString(),
    })),
    createdAt: maintenance.createdAt.toISOString(),
    updatedAt: maintenance.updatedAt.toISOString(),
  };
}
