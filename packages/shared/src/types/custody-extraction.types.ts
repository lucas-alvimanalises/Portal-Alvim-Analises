import { CustodyTemplateSchema } from './custody-template.types';

export interface CustodyExtractedValue {
  value: string;
  confidence: number;
}

export interface CustodyExtractedData {
  fields: Record<string, CustodyExtractedValue>;
  // table[columnKey][rowKey]
  table: Record<string, Record<string, CustodyExtractedValue>>;
}

export type CustodyExtractionStatus = 'PROCESSING' | 'NEEDS_REVIEW' | 'APPROVED' | 'FAILED';

export interface CustodyExtractionDto {
  id: string;
  sampleId: string;
  scheduleId: string;
  templateId: string;
  templateSchema: CustodyTemplateSchema;
  compoundName: string;
  status: CustodyExtractionStatus;
  // null quando a cadeia foi gerada por preenchimento manual, sem digitalização.
  originalScanFilename: string | null;
  extractedData: CustodyExtractedData | null;
  correctedData: CustodyExtractedData | null;
  errorMessage: string | null;
  approvedAt: string | null;
  generatedDocumentId: string | null;
  // Nome do PDF gerado (ex.: "11150_26 - Cadeia de Custódia Siloxanos.pdf")
  // — usado pra mostrar o nº do relatório de campo sem precisar de outra
  // chamada. Null enquanto não aprovada.
  generatedDocumentFilename: string | null;
  // Foto do serviço (opcional) escolhida pra entrar no PDF, abaixo de
  // "Observações" — null se nenhuma foi escolhida ainda.
  selectedPhotoId: string | null;
  selectedPhotoFilename: string | null;
  createdAt: string;
}

export interface UpdateCustodyExtractionPayload {
  correctedData: CustodyExtractedData;
}

export interface SelectCustodyExtractionPhotoPayload {
  photoId: string | null;
}
