import { IsDateString, IsOptional, IsString } from 'class-validator';

// Chega via multipart (o arquivo vem separado, via FileInterceptor) — os
// campos de texto passam pelo ValidationPipe normalmente.
export class CreateCertificateDto {
  @IsString()
  sampleId!: string;

  @IsString()
  certificateNumber!: string;

  @IsString()
  laboratory!: string;

  // Data em que o laboratório efetivamente analisou a amostra.
  @IsDateString()
  analysisDate!: string;

  // Data de emissão do documento do certificado — diferente de analysisDate.
  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;
}
