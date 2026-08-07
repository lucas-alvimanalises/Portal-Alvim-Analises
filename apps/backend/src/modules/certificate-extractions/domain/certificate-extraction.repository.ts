import { CertificateExtraction, CertificateExtractionStatus } from '@prisma/client';
import { CertificateExtractedData } from '@portal-alvim/shared';

export interface CreateCertificateExtractionData {
  sampleId: string;
  templateId: string;
}

export interface UploadedFileData {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}

export interface UpdateCertificateExtractionResultData {
  status: CertificateExtractionStatus;
  extractedData?: CertificateExtractedData | null;
  errorMessage?: string | null;
}

export interface ApproveCertificateExtractionData {
  approvedById: string;
  generatedCertificateId: string;
}

export type CertificateExtractionWithRelations = CertificateExtraction & {
  originalScanFile: { filename: string; mimeType: string; storageKey: string };
  template: {
    analytes: unknown;
    resultsMode: string;
    collapsedResultLabel: string | null;
    compound: { code: string; name: string };
  };
  sample: { clientId: string };
  generatedCertificate: { id: string } | null;
};

export const CERTIFICATE_EXTRACTION_REPOSITORY = Symbol('CERTIFICATE_EXTRACTION_REPOSITORY');

export interface CertificateExtractionRepository {
  findById(id: string): Promise<CertificateExtractionWithRelations | null>;
  findManyBySampleId(sampleId: string): Promise<CertificateExtractionWithRelations[]>;
  create(
    data: CreateCertificateExtractionData,
    file: UploadedFileData,
  ): Promise<CertificateExtractionWithRelations>;
  updateResult(
    id: string,
    data: UpdateCertificateExtractionResultData,
  ): Promise<CertificateExtractionWithRelations>;
  updateCorrections(
    id: string,
    correctedData: CertificateExtractedData,
  ): Promise<CertificateExtractionWithRelations>;
  approve(
    id: string,
    data: ApproveCertificateExtractionData,
  ): Promise<CertificateExtractionWithRelations>;
  delete(id: string): Promise<void>;
}
