import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ScheduleSamplingPointDto } from './create-schedule.dto';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  serviceTypeId?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  dateConfirmed?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  technicianIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSamplingPointDto)
  samplingPoints?: ScheduleSamplingPointDto[];

  // Ver CreateScheduleDto.overrideMaintenanceWarning — mesma regra pra edição
  // (ex.: arrastar um serviço no Calendário pra uma data com manutenção).
  @IsOptional()
  @IsBoolean()
  overrideMaintenanceWarning?: boolean;
}
