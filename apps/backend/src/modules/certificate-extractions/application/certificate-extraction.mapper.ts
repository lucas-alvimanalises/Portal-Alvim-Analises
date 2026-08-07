import {
  CertificateAnalyteConfig,
  CertificateExtractedData,
  CertificateExtractionDto,
} from '@portal-alvim/shared';
import { CertificateExtractionWithRelations } from '../domain/certificate-extraction.repository';

export function toCertificateExtractionDto(
  extraction: CertificateExtractionWithRelations,
): CertificateExtractionDto {
  return {
    id: extraction.id,
    sampleId: extraction.sampleId,
    templateId: extraction.templateId,
    compoundName: extraction.template.compound.name,
    analytes: extraction.template.analytes as unknown as CertificateAnalyteConfig[],
    status: extraction.status,
    originalScanFilename: extraction.originalScanFile.filename,
    extractedData: (extraction.extractedData as unknown as CertificateExtractedData | null) ?? null,
    correctedData: (extraction.correctedData as unknown as CertificateExtractedData | null) ?? null,
    errorMessage: extraction.errorMessage,
    approvedAt: extraction.approvedAt ? extraction.approvedAt.toISOString() : null,
    generatedCertificateId: extraction.generatedCertificate?.id ?? null,
    createdAt: extraction.createdAt.toISOString(),
  };
}
