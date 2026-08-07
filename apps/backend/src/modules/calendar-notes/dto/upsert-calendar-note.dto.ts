import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCalendarNoteDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MaxLength(280)
  text!: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;
}

export class UpdateCalendarNoteDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  text?: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string | null;
}
