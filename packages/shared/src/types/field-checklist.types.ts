// Check list de material de campo preenchido por serviço — ver
// FIELD_CHECKLIST_SECTIONS (constants) pra lista fixa de itens/seções.
// quantities: { itemKey: quantidade } — só entram itens com quantidade > 0
// (ex.: "impingers": 9).
// Foto/PDF de um checklist preenchido no papel, anexado ao checklist do
// serviço (colaborador que prefere papel). Vários por checklist.
export interface FieldChecklistAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}

export interface FieldChecklistDto {
  id: string;
  scheduleId: string;
  quantities: Record<string, number>;
  filledById: string;
  filledByName: string;
  filledAt: string;
  updatedAt: string;
  attachments: FieldChecklistAttachmentDto[];
}

export interface SaveFieldChecklistPayload {
  quantities: Record<string, number>;
}
