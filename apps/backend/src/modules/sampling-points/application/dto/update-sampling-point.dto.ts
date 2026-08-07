import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSamplingPointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  standardId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
