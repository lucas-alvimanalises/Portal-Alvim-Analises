import { IsString } from 'class-validator';

export class SaveResultsSummaryDraftDto {
  @IsString()
  comment!: string;
}
