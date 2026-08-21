import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTrackingShipmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  trackingCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;
}
