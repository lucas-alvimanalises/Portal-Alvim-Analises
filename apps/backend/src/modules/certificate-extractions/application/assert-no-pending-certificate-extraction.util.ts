import { BadRequestException } from '@nestjs/common';
import { CertificateExtractionWithRelations } from '../domain/certificate-extraction.repository';

// Diferente de cadeia de custódia (uma só por amostra), uma amostra pode ter
// vários certificados ao longo do tempo (reemissões, laudos complementares)
// — então o bloqueio aqui é mais frouxo: só impede duas leituras em
// andamento/aguardando revisão ao mesmo tempo (evita confusão sobre qual
// delas confirmar). Uma já APROVADA ou que FALHOU não bloqueia uma nova.
export function assertNoPendingCertificateExtraction(
  existing: CertificateExtractionWithRelations[],
): void {
  const hasPending = existing.some(
    (extraction) => extraction.status === 'PROCESSING' || extraction.status === 'NEEDS_REVIEW',
  );
  if (hasPending) {
    throw new BadRequestException(
      'Já existe uma leitura de certificado em andamento ou aguardando revisão para esta amostra.',
    );
  }
}
