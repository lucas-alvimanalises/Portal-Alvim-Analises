import { BadRequestException } from '@nestjs/common';
import { CertificateWithRelations } from '../domain/certificate.repository';

// Regra de negócio: só um certificado por amostra (decisão do usuário) —
// pra trocar o arquivo de um certificado já cadastrado, usa "Substituir"
// (ReplaceCertificateFileUseCase), que mantém a mesma linha e sobe a
// versão, em vez de criar um segundo Certificate pra mesma amostra.
export function assertNoExistingCertificate(existing: CertificateWithRelations[]): void {
  if (existing.length > 0) {
    throw new BadRequestException(
      'Esta amostra já tem um certificado cadastrado. Use "Substituir" pra trocar o arquivo, ou exclua o certificado atual antes de anexar outro.',
    );
  }
}
