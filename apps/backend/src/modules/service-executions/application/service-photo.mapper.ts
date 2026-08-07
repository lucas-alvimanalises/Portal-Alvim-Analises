import { ServicePhotoDto } from '@portal-alvim/shared';
import { ServicePhoto } from '../domain/service-execution.repository';

export function toServicePhotoDto(photo: ServicePhoto): ServicePhotoDto {
  return {
    id: photo.id,
    filename: photo.filename,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    uploadedByName: photo.uploadedBy.name,
    createdAt: photo.createdAt.toISOString(),
  };
}
