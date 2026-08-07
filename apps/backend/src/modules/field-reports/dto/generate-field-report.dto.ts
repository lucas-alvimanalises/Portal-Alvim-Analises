import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateFieldReportDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoIds?: string[];
}
