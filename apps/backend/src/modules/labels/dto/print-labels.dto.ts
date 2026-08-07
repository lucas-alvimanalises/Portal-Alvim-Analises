import { IsString } from 'class-validator';

export class PrintLabelsDto {
  @IsString()
  scheduleId!: string;

  @IsString()
  compoundId!: string;
}
