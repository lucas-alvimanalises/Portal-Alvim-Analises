import { MaintenanceNature, MaintenanceStatus } from '@portal-alvim/shared';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePlantMaintenanceDto {
  @IsString()
  clientId!: string;

  @IsDateString()
  date!: string;

  // "HH:mm" — texto simples, sem validação de formato rígida (o <input
  // type="time"> do navegador já garante o formato).
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsEnum(MaintenanceNature)
  nature!: MaintenanceNature;

  @IsArray()
  @IsString({ each: true })
  types!: string[];

  @IsOptional()
  @IsString()
  otherType?: string;

  @IsArray()
  @IsString({ each: true })
  objectives!: string[];

  @IsOptional()
  @IsString()
  otherObjective?: string;

  @IsString()
  description!: string;
}
