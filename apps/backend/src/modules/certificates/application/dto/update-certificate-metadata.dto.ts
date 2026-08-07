import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateCertificateMetadataDto {
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @IsOptional()
  @IsString()
  laboratory?: string;

  @IsOptional()
  @IsDateString()
  analysisDate?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
