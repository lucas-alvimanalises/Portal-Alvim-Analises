import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateContractDto {
  @IsString()
  clientId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  periodicity?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  // Clientes de formulário (ex.: checkbox group sem nenhum marcado) podem
  // enviar false/"" em vez de omitir o campo — normaliza para [] ou undefined.
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  serviceTypeIds?: string[];
}
