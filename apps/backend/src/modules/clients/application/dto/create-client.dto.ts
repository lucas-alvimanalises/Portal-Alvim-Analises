import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateClientDto {
  @IsString()
  companyName!: string;

  @IsString()
  cnpj!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Informe um link válido do Google Maps.' })
  mapsUrl?: string;

  @IsOptional()
  @IsString()
  mainContact?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
