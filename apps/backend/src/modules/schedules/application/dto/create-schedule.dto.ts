import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleSamplingPointCompoundDto {
  @IsString()
  compoundId!: string;

  // Quantas amostras desse composto serão coletadas neste ponto (ex.: 2x Siloxanos).
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ScheduleSamplingPointDto {
  @IsString()
  samplingPointId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSamplingPointCompoundDto)
  compounds!: ScheduleSamplingPointCompoundDto[];
}

export class CreateScheduleDto {
  // Opcional: o agendamento é feito direto pra empresa, sem precisar de contrato.
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsString()
  clientId!: string;

  @IsString()
  serviceTypeId!: string;

  @IsDateString()
  scheduledDate!: string;

  // Serviços de mais de um dia: data final opcional (nula = 1 dia só).
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Omitido = true (data certa). false = só o mês é conhecido ainda —
  // scheduledDate guarda o dia 1 do mês nesse caso.
  @IsOptional()
  @IsBoolean()
  dateConfirmed?: boolean;

  // Um serviço pode precisar de mais de um técnico em campo.
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  technicianIds!: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSamplingPointDto)
  samplingPoints?: ScheduleSamplingPointDto[];

  // true quando o usuário já viu o aviso de manutenção programada na mesma
  // data e confirmou "Agendar mesmo assim" (ver PlantMaintenancesService.
  // checkConflicts, CreateScheduleUseCase) — sem isso, um conflito bloqueia
  // a criação com ConflictException.
  @IsOptional()
  @IsBoolean()
  overrideMaintenanceWarning?: boolean;
}
