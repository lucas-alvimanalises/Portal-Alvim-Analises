import { IsObject } from 'class-validator';

export class SaveFieldChecklistDto {
  // { itemKey: quantidade } — validação de conteúdo (chaves conhecidas,
  // valores numéricos) fica a cargo do serviço, não vale a pena um DTO
  // por item pro catálogo de ChecklistItem (ver ChecklistCatalogService).
  @IsObject()
  quantities!: Record<string, number>;
}
