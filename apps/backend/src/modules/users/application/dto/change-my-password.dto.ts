import { IsString, MinLength } from 'class-validator';

export class ChangeMyPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
