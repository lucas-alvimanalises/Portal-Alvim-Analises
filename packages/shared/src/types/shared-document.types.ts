import { Role } from '../enums';

// "Documentos Compartilhados" — pasta por empresa (Client) onde ADMIN/MANAGER
// e o próprio CLIENT sobem/consultam arquivos, ver SharedDocumentsService.
export interface SharedDocumentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedByName: string;
  uploadedByRole: Role;
  createdAt: string;
}
