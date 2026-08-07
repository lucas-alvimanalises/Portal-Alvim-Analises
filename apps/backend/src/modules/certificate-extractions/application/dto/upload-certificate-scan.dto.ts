import { IsString } from 'class-validator';

export class UploadCertificateScanDto {
  @IsString()
  sampleId!: string;
}
