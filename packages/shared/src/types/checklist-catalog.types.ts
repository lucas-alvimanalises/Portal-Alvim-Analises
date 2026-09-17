// Catálogo do Check List de Material de Campo — editável pelo portal (ver
// ChecklistCatalogService), substitui o antigo FIELD_CHECKLIST_SECTIONS
// fixo no código.
export interface ChecklistItemDto {
  id: string;
  key: string;
  label: string;
  order: number;
}

export interface ChecklistSectionDto {
  id: string;
  key: string;
  label: string;
  order: number;
  items: ChecklistItemDto[];
}

export interface CreateChecklistItemPayload {
  label: string;
}

export interface UpdateChecklistItemPayload {
  label?: string;
  active?: boolean;
}
