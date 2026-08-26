import { LocalTipCategory } from '@portal-alvim/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateLocalTipDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(LocalTipCategory)
  category?: LocalTipCategory;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  mapsUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
