import { ComplianceStatus } from '@prisma/client';

// Extrai o primeiro número do texto de resultado (ex.: "< 0,012 mg Cl/m³" →
// 0.012, "250 mg/m³" → 250) — trata vírgula decimal (pt-BR). null se não
// houver número legível.
function parseNumericResult(resultText: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(resultText);
  if (!match) return null;
  return Number(match[0].replace(',', '.'));
}

// Pra laudos que reportam não-detectado como "0,00" em vez de "< LQ" (ex.:
// Compostos Sulfurados) — usado no resultsMode SKIP_ZERO pra decidir quais
// parâmetros omitir da linha de resultado.
export function isZeroResult(resultText: string): boolean {
  const value = parseNumericResult(resultText);
  return value !== null && value === 0;
}

// Compara o resultado lido contra o limite regulatório fixo do parâmetro
// (ver CertificateAnalyteConfig.regulatoryLimit/warningThreshold/regulatoryMin).
// Resultados "< X" (abaixo do limite de quantificação) são tratados como
// "no máximo X" — comparação conservadora e válida: se X já é menor que o
// limite, o valor real (que é ≤ X) também é.
// - Sem warningThreshold nem regulatoryMin: Conforme até o limite, Não
//   Conforme acima.
// - Com warningThreshold: Conforme até o warningThreshold, Atenção entre o
//   warningThreshold e o limite, Não Conforme acima do limite (ex.:
//   Siloxanos — Conforme até 0,21 mg Si/m³, Atenção até 0,3, Não Conforme
//   acima).
// - Com regulatoryMin: faixa [regulatoryMin, regulatoryLimit] — Não Conforme
//   abaixo do mínimo ou acima do limite, Conforme entre os dois (ex.: COG de
//   Compostos Sulfurados — faixa de 15 a 30 mg/m³).
// undefined quando não há limite definido pro parâmetro (monitorado, mas
// sem regra de conformidade) ou o texto não tem número legível.
export function computeCompliance(
  resultText: string,
  regulatoryLimit: number | undefined,
  warningThreshold?: number,
  regulatoryMin?: number,
): ComplianceStatus | undefined {
  if (regulatoryLimit === undefined) return undefined;
  const value = parseNumericResult(resultText);
  if (value === null) return undefined;

  if (value > regulatoryLimit) return ComplianceStatus.NAO_CONFORME;
  if (regulatoryMin !== undefined && value < regulatoryMin) return ComplianceStatus.NAO_CONFORME;
  if (warningThreshold !== undefined && value > warningThreshold) return ComplianceStatus.ATENCAO;
  return ComplianceStatus.CONFORME;
}

// Texto de exibição pro campo "Limite" (specLimit) — ex.: "5,00 mg Cl/m³",
// "0,30 mg Si/m³ (atenção ≥ 0,21)" quando há um patamar de atenção, ou
// "15,00 a 30,00 mg/m³" quando é uma faixa (regulatoryMin definido).
export function formatRegulatoryLimit(
  limit: number,
  unit: string,
  warningThreshold?: number,
  regulatoryMin?: number,
): string {
  if (regulatoryMin !== undefined) {
    return `${regulatoryMin.toFixed(2).replace('.', ',')} a ${limit.toFixed(2).replace('.', ',')} ${unit}`;
  }
  const base = `${limit.toFixed(2).replace('.', ',')} ${unit}`;
  if (warningThreshold === undefined) return base;
  return `${base} (atenção ≥ ${warningThreshold.toFixed(2).replace('.', ',')})`;
}
