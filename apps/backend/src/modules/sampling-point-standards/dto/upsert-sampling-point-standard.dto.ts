import { IsString } from 'class-validator';

export class CreateSamplingPointStandardDto {
  @IsString()
  name!: string;
}

export class UpdateSamplingPointStandardDto {
  @IsString()
  name!: string;
}
