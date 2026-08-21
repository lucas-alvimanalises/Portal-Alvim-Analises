export interface CustodyDocumentDto {
  id: string;
  compoundId: string;
  compoundCode: string;
  compoundName: string;
  // Ano da pasta de origem (2024, 2025, ...) — não é a data de upload.
  year: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}

// O upload em si vai como multipart/FormData (arquivo + estes campos como
// texto), não como um corpo JSON — este tipo documenta os campos esperados.
export interface CustodyDocumentUploadFields {
  compoundId: string;
  year: number;
  // Preenchido só ao anexar uma cadeia de custódia já pronta direto na
  // criação da amostra (ver AnalysisSlot) — vincula o documento à amostra
  // sem passar pelo fluxo de leitura por IA nem pelo de digitação manual.
  sampleId?: string;
}

// Resultado do botão "Atualizar pastas" (POST /custody-documents/sync) —
// varredura da pasta local configurada no backend, período de transição
// enquanto nem tudo é carregado direto na plataforma.
export interface CustodyDocumentsSyncResult {
  scanned: number;
  uploaded: number;
  skipped: number;
  failures: { file: string; reason: string }[];
}

// Resultado do botão "Remover duplicatas" (POST /custody-documents/dedupe) —
// só remove o padrão seguro (2 cópias, uma órfã + uma vinculada a amostra);
// qualquer grupo fora disso (3+ cópias, ou 2 já vinculadas a amostras
// diferentes) entra em skippedGroups pra revisão manual, nunca apagado
// automaticamente.
export interface CustodyDocumentsDedupeSkippedGroup {
  compoundCode: string;
  filename: string;
  documentIds: string[];
}

export interface CustodyDocumentsDedupeResult {
  deleted: number;
  failures: { id: string; reason: string }[];
  skippedGroups: CustodyDocumentsDedupeSkippedGroup[];
}
