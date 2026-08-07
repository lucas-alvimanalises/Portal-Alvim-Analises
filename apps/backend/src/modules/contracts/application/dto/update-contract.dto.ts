import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  periodicity?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
