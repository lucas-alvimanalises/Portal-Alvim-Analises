// Check list de material de campo preenchido por serviço — ver
// FIELD_CHECKLIST_SECTIONS (constants) pra lista fixa de itens/seções.
// quantities: { itemKey: quantidade } — só entram itens com quantidade > 0
// (ex.: "impingers": 9).
export interface FieldChecklistDto {
  id: string;
  scheduleId: string;
  quantities: Record<string, number>;
  filledById: string;
  filledByName: string;
  filledAt: string;
  updatedAt: string;
}

export interface SaveFieldChecklistPayload {
  quantities: Record<string, number>;
}
