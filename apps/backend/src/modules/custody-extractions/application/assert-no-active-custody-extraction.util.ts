import { BadRequestException } from '@nestjs/common';
import { CustodyExtractionWithRelations } from '../domain/custody-extraction.repository';

// Regra de negócio: só uma cadeia de custódia por amostra. Uma tentativa que
// falhou (FAILED, ex.: IA não conseguiu ler o escaneado) não conta contra
// esse limite — pode tentar de novo. Já existindo uma em PROCESSING,
// NEEDS_REVIEW ou APPROVED, nenhuma nova pode ser criada.
export function assertNoActiveCustodyExtraction(existing: CustodyExtractionWithRelations[]): void {
  const hasActive = existing.some((extraction) => extraction.status !== 'FAILED');
  if (hasActive) {
    throw new BadRequestException('Esta amostra já tem uma cadeia de custódia cadastrada.');
  }
}
