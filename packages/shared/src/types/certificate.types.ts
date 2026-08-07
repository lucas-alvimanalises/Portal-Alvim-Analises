// Um parâmetro que a IA leu do certificado na aprovação da leitura (ver
// CertificateExtraction) — exibido junto do certificado pra mostrar o que
// foi extraído sem precisar abrir a tela de conferência de novo.
export interface CertificateExtractedResultSummary {
  label: string;
  result: string;
  unit: string;
}

export interface CertificateDto {
  id: string;
  sampleId: string;
  certificateNumber: string;
  laboratory: string;
  // Data em que o laboratório efetivamente analisou a amostra.
  analysisDate: string;
  // Data de emissão do documento do certificado — diferente de analysisDate.
  issueDate: string;
  responsibleUserId: string | null;
  responsibleUserName?: string;
  version: string;
  status: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  // Presente só quando o certificado veio de uma leitura por IA aprovada —
  // ausente pros anexados manualmente, sem digitalização.
  extractedResults?: CertificateExtractedResultSummary[];
  createdAt: string;
  updatedAt: string;
}

// O upload em si vai como multipart/FormData (arquivo + estes campos como
// texto), não como um corpo JSON — este tipo documenta os campos esperados.
export interface CertificateUploadFields {
  sampleId: string;
  certificateNumber: string;
  laboratory: string;
  analysisDate: string;
  issueDate: string;
  responsibleUserId?: string;
}

export interface UpdateCertificateMetadataPayload {
  certificateNumber?: string;
  laboratory?: string;
  analysisDate?: string;
  issueDate?: string;
  responsibleUserId?: string;
  status?: string;
}
