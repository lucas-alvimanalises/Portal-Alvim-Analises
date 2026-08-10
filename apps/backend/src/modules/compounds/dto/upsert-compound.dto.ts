import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCompoundDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  samplerType?: string;
}

export class UpdateCompoundDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  samplerType?: string;
}
