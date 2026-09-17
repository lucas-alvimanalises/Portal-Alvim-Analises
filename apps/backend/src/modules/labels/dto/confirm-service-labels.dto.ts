import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConfirmServiceLabelsDto {
  @IsString()
  scheduleId!: string;

  // Códigos de composto pra deixar de fora deste lote (ver VOCS_LABEL_CODE).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeCodes?: string[];
}
