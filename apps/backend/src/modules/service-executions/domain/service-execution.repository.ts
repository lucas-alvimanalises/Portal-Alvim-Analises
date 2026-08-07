import { ServiceExecution, Prisma } from '@prisma/client';

export const SERVICE_EXECUTION_REPOSITORY = Symbol('SERVICE_EXECUTION_REPOSITORY');

export interface UploadedFileData {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}

export interface ServicePhoto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
  uploadedBy: { name: string };
}

// "Fotos do Serviço" (botão em /agendamentos/:id/resultados) reaproveita o
// model ServiceExecution já existente no schema (fase 1: só schema +
// repositório mínimo, sem rota) como o "balde" de anexos de uma visita —
// criado sob demanda no primeiro upload de foto, não precisa de um fluxo
// de checklist/execução formal pra isso.
export interface ServiceExecutionRepository {
  findById(id: string): Promise<ServiceExecution | null>;
  findByScheduleId(scheduleId: string): Promise<ServiceExecution | null>;
  create(data: Prisma.ServiceExecutionUncheckedCreateInput): Promise<ServiceExecution>;
  listPhotos(serviceExecutionId: string): Promise<ServicePhoto[]>;
  addPhoto(serviceExecutionId: string, file: UploadedFileData): Promise<ServicePhoto>;
  // Pra checar ownership antes de excluir (Attachment -> ServiceExecution ->
  // Schedule.clientId), sem precisar de outro repositório injetado.
  findPhotoOwnerClientId(photoId: string): Promise<string | null>;
  // Retorna o storageKey antigo pra a use-case só apagar o arquivo físico
  // depois que o banco confirmar a exclusão da linha.
  deletePhoto(photoId: string): Promise<{ storageKey: string }>;
}
