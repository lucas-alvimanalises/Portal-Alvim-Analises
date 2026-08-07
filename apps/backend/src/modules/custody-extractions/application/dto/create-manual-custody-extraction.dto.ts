import { IsString } from 'class-validator';

export class CreateManualCustodyExtractionDto {
  @IsString()
  sampleId!: string;
}
