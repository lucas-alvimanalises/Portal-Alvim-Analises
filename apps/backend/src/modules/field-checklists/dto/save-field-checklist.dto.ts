import { IsObject } from 'class-validator';

export class SaveFieldChecklistDto {
  // { itemKey: quantidade } — validação de conteúdo (chaves conhecidas,
  // valores numéricos) fica a cargo do serviço, não vale a pena um DTO
  // por item pra uma lista fixa que só cresce (ver FIELD_CHECKLIST_SECTIONS).
  @IsObject()
  quantities!: Record<string, number>;
}
