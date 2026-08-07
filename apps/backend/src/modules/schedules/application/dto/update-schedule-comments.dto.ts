import { IsOptional, IsString } from 'class-validator';

export class UpdateScheduleCommentsDto {
  @IsOptional()
  @IsString()
  internalComments?: string;

  @IsOptional()
  @IsString()
  clientComments?: string;

  @IsOptional()
  @IsString()
  clientResponse?: string;
}
