import { CustodyDocumentDto } from '@portal-alvim/shared';
import { CustodyDocumentWithRelations } from '../domain/custody-document.repository';

export function toCustodyDocumentDto(document: CustodyDocumentWithRelations): CustodyDocumentDto {
  return {
    id: document.id,
    compoundId: document.compoundId,
    compoundCode: document.compound.code,
    compoundName: document.compound.name,
    year: document.year,
    filename: document.file.filename,
    mimeType: document.file.mimeType,
    sizeBytes: document.file.sizeBytes,
    uploadedByName: document.uploadedBy.name,
    createdAt: document.createdAt.toISOString(),
  };
}
