import { ScheduleStatus } from '@portal-alvim/shared';
import { IsEnum } from 'class-validator';

export class UpdateScheduleStatusDto {
  @IsEnum(ScheduleStatus)
  status!: ScheduleStatus;
}
