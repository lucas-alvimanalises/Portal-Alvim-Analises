import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ComplianceStatus } from '@portal-alvim/shared';

export class ResultRowDto {
  @IsString()
  parameterName!: string;

  // Texto livre — preserva notação de laudo como "< 0,01" sem virar número.
  @IsString()
  result!: string;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  specLimit?: string;

  @IsOptional()
  @IsEnum(ComplianceStatus)
  compliance?: ComplianceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  @Min(0)
  order!: number;
}

export class ReplaceSampleResultRowsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultRowDto)
  rows!: ResultRowDto[];
}
