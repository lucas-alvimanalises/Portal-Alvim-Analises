import { IsString } from 'class-validator';

export class ConfirmServiceLabelsDto {
  @IsString()
  scheduleId!: string;
}
