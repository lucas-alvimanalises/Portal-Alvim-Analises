export interface UploadFileInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface UploadFileResult {
  storageKey: string;
  sizeBytes: number;
}

export const FILE_STORAGE_SERVICE = Symbol('FILE_STORAGE_SERVICE');

// Porta de armazenamento de arquivos. Adapter local hoje (LocalFileStorageService);
// trocar para S3/Supabase Storage no futuro é só mudar o binding em
// attachments.module.ts, sem tocar em nenhum módulo consumidor (samples,
// certificates, service-executions).
export interface FileStorageService {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  getUrl(storageKey: string): string;
  delete(storageKey: string): Promise<void>;
  // Lê o arquivo de volta (ex.: download de certificado). Lança se não existir.
  getStream(storageKey: string): Promise<NodeJS.ReadableStream>;
}
