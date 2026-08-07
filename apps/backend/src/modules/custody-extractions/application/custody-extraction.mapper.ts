import { CustodyExtractedData, CustodyExtractionDto, CustodyTemplateSchema } from '@portal-alvim/shared';
import { CustodyExtractionWithRelations } from '../domain/custody-extraction.repository';

export function toCustodyExtractionDto(
  extraction: CustodyExtractionWithRelations,
): CustodyExtractionDto {
  return {
    id: extraction.id,
    sampleId: extraction.sampleId,
    scheduleId: extraction.sample.scheduleId,
    templateId: extraction.templateId,
    templateSchema: extraction.template.fields as unknown as CustodyTemplateSchema,
    compoundName: extraction.template.compound.name,
    status: extraction.status,
    originalScanFilename: extraction.originalScanFile?.filename ?? null,
    extractedData: (extraction.extractedData as unknown as CustodyExtractedData | null) ?? null,
    correctedData: (extraction.correctedData as unknown as CustodyExtractedData | null) ?? null,
    errorMessage: extraction.errorMessage,
    approvedAt: extraction.approvedAt ? extraction.approvedAt.toISOString() : null,
    generatedDocumentId: extraction.generatedDocumentId,
    generatedDocumentFilename: extraction.generatedDocument?.file.filename ?? null,
    selectedPhotoId: extraction.selectedPhotoId,
    selectedPhotoFilename: extraction.selectedPhoto?.filename ?? null,
    createdAt: extraction.createdAt.toISOString(),
  };
}
