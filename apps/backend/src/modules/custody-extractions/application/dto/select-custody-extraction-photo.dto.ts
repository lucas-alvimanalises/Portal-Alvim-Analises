import { IsOptional, IsString } from 'class-validator';

export class SelectCustodyExtractionPhotoDto {
  @IsOptional()
  @IsString()
  photoId?: string | null;
}
