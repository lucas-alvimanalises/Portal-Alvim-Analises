import { IsObject } from 'class-validator';
import { CustodyExtractedData } from '@portal-alvim/shared';

// Estrutura livre (chaves dinâmicas por template) — sem validação profunda
// campo a campo, mesmo padrão de outros payloads JSON flexíveis do app.
export class UpdateCustodyExtractionDto {
  @IsObject()
  correctedData!: CustodyExtractedData;
}
