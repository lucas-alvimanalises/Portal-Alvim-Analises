import { MaintenanceNature, MaintenanceStatus } from '@portal-alvim/shared';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePlantMaintenanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenanceNature)
  nature?: MaintenanceNature;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @IsOptional()
  @IsString()
  otherType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @IsOptional()
  @IsString()
  otherObjective?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
