import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { AnpReportParameter } from '@portal-alvim/shared';

export class UpdateAnpRegulatoryLimitItemDto {
  @IsEnum(AnpReportParameter)
  parameter!: AnpReportParameter;

  @IsNumber()
  @Min(0)
  regulatoryLimit!: number;

  @IsString()
  unit!: string;
}

export class UpdateAnpRegulatoryLimitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateAnpRegulatoryLimitItemDto)
  items!: UpdateAnpRegulatoryLimitItemDto[];
}
