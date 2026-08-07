import { CustodyDocument } from '@prisma/client';

export interface CreateCustodyDocumentData {
  compoundId: string;
  year: number;
  uploadedById: string;
  // Preenchido só pelo fluxo de digitalização inteligente (custody-extractions)
  // — documentos importados em massa do OneDrive não têm amostra rastreável.
  sampleId?: string;
}

export interface UploadedFileData {
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}

export type CustodyDocumentWithRelations = CustodyDocument & {
  file: { filename: string; mimeType: string; sizeBytes: number; storageKey: string };
  compound: { code: string; name: string };
  uploadedBy: { name: string };
};

export const CUSTODY_DOCUMENT_REPOSITORY = Symbol('CUSTODY_DOCUMENT_REPOSITORY');

export interface CustodyDocumentRepository {
  findById(id: string): Promise<CustodyDocumentWithRelations | null>;
  // compoundId omitido devolve todos os documentos (usado pra contar por
  // pasta na tela /amostras).
  findMany(compoundId?: string): Promise<CustodyDocumentWithRelations[]>;
  create(
    data: CreateCustodyDocumentData,
    file: UploadedFileData,
  ): Promise<CustodyDocumentWithRelations>;
  // Retorna o storageKey antigo pra a use-case só apagar o arquivo físico
  // depois que o banco confirmar a exclusão da linha.
  delete(id: string): Promise<{ storageKey: string }>;
}
