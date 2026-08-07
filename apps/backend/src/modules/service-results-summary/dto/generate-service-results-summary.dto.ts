import { IsString } from 'class-validator';

export class GenerateServiceResultsSummaryDto {
  @IsString()
  comment!: string;
}
