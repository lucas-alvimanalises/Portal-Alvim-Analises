import { CustodyExtraction, CustodyExtractionStatus } from '@prisma/client';
import { CustodyExtractedData } from '@portal-alvim/shared';

export interface CreateCustodyExtractionData {
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

export interface UpdateCustodyExtractionResultData {
  status: CustodyExtractionStatus;
  extractedData?: CustodyExtractedData | null;
  errorMessage?: string | null;
}

export interface ApproveCustodyExtractionData {
  approvedById: string;
  generatedDocumentId: string;
}

export type CustodyExtractionWithRelations = CustodyExtraction & {
  originalScanFile: { filename: string; mimeType: string; storageKey: string } | null;
  template: { fields: unknown; compound: { code: string; name: string } };
  sample: { scheduleId: string };
  selectedPhoto: { filename: string; mimeType: string; storageKey: string } | null;
  generatedDocument: { file: { filename: string } } | null;
};

export const CUSTODY_EXTRACTION_REPOSITORY = Symbol('CUSTODY_EXTRACTION_REPOSITORY');

export interface CustodyExtractionRepository {
  findById(id: string): Promise<CustodyExtractionWithRelations | null>;
  findManyBySampleId(sampleId: string): Promise<CustodyExtractionWithRelations[]>;
  create(
    data: CreateCustodyExtractionData,
    file: UploadedFileData,
  ): Promise<CustodyExtractionWithRelations>;
  // Sem digitalização/IA — cria já em NEEDS_REVIEW com os campos em branco,
  // pro técnico preencher direto na tela de conferência.
  createManual(data: CreateCustodyExtractionData): Promise<CustodyExtractionWithRelations>;
  updateResult(
    id: string,
    data: UpdateCustodyExtractionResultData,
  ): Promise<CustodyExtractionWithRelations>;
  updateCorrections(
    id: string,
    correctedData: CustodyExtractedData,
  ): Promise<CustodyExtractionWithRelations>;
  updateSelectedPhoto(id: string, photoId: string | null): Promise<CustodyExtractionWithRelations>;
  approve(id: string, data: ApproveCustodyExtractionData): Promise<CustodyExtractionWithRelations>;
  delete(id: string): Promise<void>;
}
