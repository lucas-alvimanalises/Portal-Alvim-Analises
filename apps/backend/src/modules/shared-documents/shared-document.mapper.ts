import { Attachment, User } from '@prisma/client';
import { SharedDocumentDto } from '@portal-alvim/shared';

type SharedDocumentRow = Attachment & {
  uploadedBy: Pick<User, 'name' | 'role'>;
};

export function toSharedDocumentDto(row: SharedDocumentRow): SharedDocumentDto {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedById: row.uploadedById,
    uploadedByName: row.uploadedBy.name,
    uploadedByRole: row.uploadedBy.role as unknown as SharedDocumentDto['uploadedByRole'],
    createdAt: row.createdAt.toISOString(),
  };
}
