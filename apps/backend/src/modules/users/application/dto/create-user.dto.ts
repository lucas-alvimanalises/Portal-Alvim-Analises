import { Role } from '@portal-alvim/shared';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsEnum(Role)
  role!: Role;

  // Empresas que este usuário poderá acessar — só faz sentido quando role = CLIENT.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clientIds?: string[];

  // Preferência de receber notificações por e-mail (ex.: PDF de Ordem de
  // Serviço). Relevante sobretudo para role = CLIENT.
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
