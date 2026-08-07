import { IsOptional, IsString } from 'class-validator';

export class CreateSamplingPointDto {
  @IsString()
  clientId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  standardId?: string;
}
