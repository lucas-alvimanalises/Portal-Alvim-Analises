import { ComplianceStatus } from '@portal-alvim/shared';

// Compliance do Reporte ANP é sempre binário (limite máximo, sem faixa
// mínima nem patamar de "atenção" — diferente do
// certificate-compliance.util.ts genérico dos certificados) e calculado
// contra o `AnpRegulatoryLimit` configurável, não contra o limite do
// template de certificado. Cópia local e propositalmente independente
// (não importa `certificate-compliance.util.ts`, que não exporta o parser
// numérico e vive noutro módulo com outra régua de negócio).
export function parseAnpNumericResult(resultText: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(resultText);
  if (!match) return null;
  return Number(match[0].replace(',', '.'));
}

// Resultado sem número legível (raro — ex.: campo em branco) não vira
// "Não Conforme" sem evidência: assume Conforme por padrão nesse caso.
export function computeAnpCompliance(resultText: string, regulatoryLimit: number): ComplianceStatus {
  const value = parseAnpNumericResult(resultText);
  if (value === null) return ComplianceStatus.CONFORME;
  return value > regulatoryLimit ? ComplianceStatus.NAO_CONFORME : ComplianceStatus.CONFORME;
}

export function formatAnpResult(result: string, unit: string): string {
  if (!unit || result.includes(unit)) return result;
  return `${result} ${unit}`;
}
