import { AnalysisStatus } from '@portal-alvim/shared';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSampleDto {
  @IsString()
  clientId!: string;

  @IsString()
  scheduleId!: string;

  @IsOptional()
  @IsString()
  samplingPointId?: string;

  // Composto amostrado (11000 - Siloxanos etc.) — obrigatório no cadastro.
  @IsString()
  compoundId!: string;

  @IsDateString()
  collectionDate!: string;

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
  @IsString()
  sampleCode?: string;

  @IsOptional()
  @IsEnum(AnalysisStatus)
  analysisStatus?: AnalysisStatus;
}
