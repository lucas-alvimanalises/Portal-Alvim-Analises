import { IsObject } from 'class-validator';
import { CertificateExtractedData } from '@portal-alvim/shared';

// Estrutura livre (lista de resultados varia por composto) — sem validação
// profunda campo a campo, mesmo padrão de outros payloads JSON flexíveis do
// app (ver UpdateCustodyExtractionDto).
export class UpdateCertificateExtractionDto {
  @IsObject()
  correctedData!: CertificateExtractedData;
}
