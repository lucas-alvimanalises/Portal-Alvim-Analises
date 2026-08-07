import { IsString } from 'class-validator';

// Chega via multipart (o arquivo vem separado, via FileInterceptor).
export class UploadCustodyScanDto {
  @IsString()
  sampleId!: string;
}
