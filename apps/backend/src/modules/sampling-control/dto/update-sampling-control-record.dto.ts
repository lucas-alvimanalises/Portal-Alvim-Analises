import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateSamplingControlRecordDto {
  // Único campo editável pela tela — "Responsável pelo Faturamento". null/""
  // limpa o campo.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  billingResponsible?: string | null;
}
