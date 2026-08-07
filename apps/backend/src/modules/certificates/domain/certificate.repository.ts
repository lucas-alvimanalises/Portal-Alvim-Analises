import { Certificate } from '@prisma/client';

export interface CreateCertificateData {
  sampleId: string;
  certificateNumber: string;
  laboratory: string;
  analysisDate: Date;
  issueDate: Date;
  responsibleUserId?: string;
}

export type UpdateCertificateMetadata = Partial<Omit<CreateCertificateData, 'sampleId'>> & {
  status?: string;
};

export interface UploadedFileData {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}

export type CertificateWithRelations = Certificate & {
  file: { filename: string; mimeType: string; sizeBytes: number; storageKey: string };
  responsibleUser?: { name: string } | null;
  // Presente só em certificados criados a partir de uma leitura por IA
  // aprovada (ver módulo certificate-extractions) — usado pra exibir os
  // parâmetros lidos junto do certificado.
  extractionOrigin?: {
    extractedData: unknown;
    correctedData: unknown;
    template: { analytes: unknown };
  } | null;
};

export const CERTIFICATE_REPOSITORY = Symbol('CERTIFICATE_REPOSITORY');

export interface CertificateRepository {
  findById(id: string): Promise<CertificateWithRelations | null>;
  findManyBySampleId(sampleId: string): Promise<CertificateWithRelations[]>;
  create(data: CreateCertificateData, file: UploadedFileData): Promise<CertificateWithRelations>;
  // Substitui o arquivo (nova versão) e apaga a linha do Attachment antigo —
  // retorna o storageKey antigo pra a use-case só apagar o arquivo físico
  // depois que o banco confirmar a troca.
  replaceFile(
    id: string,
    file: UploadedFileData,
  ): Promise<{ certificate: CertificateWithRelations; oldStorageKey: string }>;
  updateMetadata(id: string, data: UpdateCertificateMetadata): Promise<CertificateWithRelations>;
  delete(id: string): Promise<{ storageKey: string }>;
}
