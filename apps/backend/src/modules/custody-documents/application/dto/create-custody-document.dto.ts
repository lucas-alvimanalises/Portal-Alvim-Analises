import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Chega via multipart (o arquivo vem separado, via FileInterceptor) — os
// campos de texto passam pelo ValidationPipe normalmente. `year` chega como
// string do FormData; @Type converte pra number antes da validação.
export class CreateCustodyDocumentDto {
  @IsString()
  compoundId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  // Preenchido só quando o upload acontece direto na criação da amostra
  // (anexar uma cadeia de custódia já pronta) — ver
  // UploadCustodyDocumentUseCase.
  @IsOptional()
  @IsString()
  sampleId?: string;
}
