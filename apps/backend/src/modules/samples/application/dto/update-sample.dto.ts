import { AnalysisStatus } from '@portal-alvim/shared';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSampleDto {
  @IsOptional()
  @IsString()
  samplingPointId?: string;

  @IsOptional()
  @IsString()
  compoundId?: string;

  @IsOptional()
  @IsDateString()
  collectionDate?: string;

  @IsOptional()
  @IsString()
  collectionLocation?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  analysisType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  sampleCode?: string;

  @IsOptional()
  @IsEnum(AnalysisStatus)
  analysisStatus?: AnalysisStatus;
}
