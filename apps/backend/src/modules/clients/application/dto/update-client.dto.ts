import { ClientStatus } from '@portal-alvim/shared';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

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

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
