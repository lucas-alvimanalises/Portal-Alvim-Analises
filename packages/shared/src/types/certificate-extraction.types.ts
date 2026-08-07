import { CertificateAnalyteConfig } from './certificate-analyte-template.types';

export interface CertificateExtractedResultRow {
  key: string;
  parameterName: string;
  // Texto completo lido do laudo, incluindo símbolo/unidade (ex.: "< 0,012 mg
  // Cl/m³" ou "250 mg/m³") — mesma filosofia de SampleResultRow.result:
  // texto livre, sem tentar virar número, pra não perder precisão/formato.
  result: string;
  unit: string;
  confidence: number;
}

export interface CertificateExtractedData {
  certificateNumber: string;
  certificateNumberConfidence: number;
  laboratory: string;
  laboratoryConfidence: number;
  // Data em que o laboratório analisou os parâmetros monitorados (coluna
  // "Data Análise" das linhas lidas) — ISO "AAAA-MM-DD".
  analysisDate: string;
  analysisDateConfidence: number;
  // "Data de Publicação" do laudo — vira Certificate.issueDate.
  issueDate: string;
  issueDateConfidence: number;
  results: CertificateExtractedResultRow[];
}

export type CertificateExtractionStatus = 'PROCESSING' | 'NEEDS_REVIEW' | 'APPROVED' | 'FAILED';

export interface CertificateExtractionDto {
  id: string;
  sampleId: string;
  templateId: string;
  compoundName: string;
  // Lista de parâmetros configurados pro composto (ver
  // CertificateAnalyteConfig) — usada na tela de conferência pra saber quais
  // linhas mostrar e seus rótulos, mesmo papel de templateSchema em
  // CustodyExtractionDto.
  analytes: CertificateAnalyteConfig[];
  status: CertificateExtractionStatus;
  originalScanFilename: string;
  extractedData: CertificateExtractedData | null;
  correctedData: CertificateExtractedData | null;
  errorMessage: string | null;
  approvedAt: string | null;
  generatedCertificateId: string | null;
  createdAt: string;
}

export interface UpdateCertificateExtractionPayload {
  correctedData: CertificateExtractedData;
}
