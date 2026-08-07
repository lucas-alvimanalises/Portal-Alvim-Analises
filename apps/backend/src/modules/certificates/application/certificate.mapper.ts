import {
  CertificateAnalyteConfig,
  CertificateDto,
  CertificateExtractedData,
  CertificateExtractedResultSummary,
} from '@portal-alvim/shared';
import { CertificateWithRelations } from '../domain/certificate.repository';

function buildExtractedResults(
  origin: CertificateWithRelations['extractionOrigin'],
): CertificateExtractedResultSummary[] | undefined {
  if (!origin) return undefined;
  const data = (origin.correctedData ?? origin.extractedData) as unknown as CertificateExtractedData | null;
  if (!data) return undefined;
  const analytes = origin.template.analytes as unknown as CertificateAnalyteConfig[];
  const analytesByKey = new Map(analytes.map((analyte) => [analyte.key, analyte]));

  return data.results
    .filter((result) => result.result?.trim())
    .map((result) => ({
      label: analytesByKey.get(result.key)?.label ?? result.key,
      result: result.result,
      unit: result.unit,
    }));
}

export function toCertificateDto(certificate: CertificateWithRelations): CertificateDto {
  return {
    id: certificate.id,
    sampleId: certificate.sampleId,
    certificateNumber: certificate.certificateNumber,
    laboratory: certificate.laboratory,
    analysisDate: certificate.analysisDate.toISOString(),
    issueDate: certificate.issueDate.toISOString(),
    responsibleUserId: certificate.responsibleUserId,
    responsibleUserName: certificate.responsibleUser?.name,
    version: certificate.version,
    status: certificate.status,
    filename: certificate.file.filename,
    mimeType: certificate.file.mimeType,
    sizeBytes: certificate.file.sizeBytes,
    extractedResults: buildExtractedResults(certificate.extractionOrigin),
    createdAt: certificate.createdAt.toISOString(),
    updatedAt: certificate.updatedAt.toISOString(),
  };
}
