import { BarreiraComparisonRow, ServiceResultsSummaryRow } from '@portal-alvim/shared';

// Nomes exatos dos padrões de ponto (ver SAMPLING_POINT_STANDARDS em
// prisma/seed.ts) — únicos dois que entram nesta comparação, por pedido
// explícito do usuário (outros pares de pontos ficam fora de escopo nesta
// primeira versão).
export const FIRST_BARREIRA_STANDARD_NAME = '1ª Barreira (ANP)';
export const SECOND_BARREIRA_STANDARD_NAME = '2ª Barreira';

// Um resultado "< X" (abaixo do limite de quantificação do equipamento) não
// significa "o valor é X" — na prática é indistinguível de zero (o
// equipamento só garante que está abaixo daquele patamar, não qual é o
// valor real). Diferente de anp-compliance.util.ts (parseAnpNumericResult),
// que propositalmente usa o valor de "X" como estimativa CONSERVADORA pra
// checar conformidade (pior caso possível) — aqui o objetivo é outro
// (comparar magnitude real entre 1ª e 2ª barreira), então "<X" vira 0
// (confirmado com o usuário: "<0,21" é como se fosse 0,0, nunca 0,21).
function parseNumericValue(result: string): number | null {
  const trimmed = result.trim();
  if (trimmed.startsWith('<')) return 0;
  const match = /-?\d+(?:[.,]\d+)?/.exec(trimmed);
  if (!match) return null;
  return Number(match[0].replace(',', '.'));
}

// O texto de "result" no banco às vezes já vem com a unidade embutida (ex.:
// "< 0,0075 mg Cl/m3") — mesma checagem já usada em resultado do resumo
// principal (ver formatResult em results-summary-pdf.util.ts), pra não
// duplicar a unidade quando ela já está no texto.
function formatValue(result: string, unit: string): string {
  const text = unit && !result.includes(unit) ? `${result} ${unit}` : result;
  return text.trim();
}

// "Variação" em linguagem simples — formula pedida pelo usuário:
// (1ªBarreira − 2ªBarreira) / 1ªBarreira × 100. Positivo = reduziu da 1ª
// pra 2ª barreira (esperado, já que a 2ª barreira é tratamento adicional).
function describeVariation(firstValue: number, secondValue: number): string {
  if (firstValue === 0) return 'não comparável';
  const variation = ((firstValue - secondValue) / firstValue) * 100;
  const rounded = Math.round(Math.abs(variation));
  if (rounded < 1) return 'sem alteração';
  return variation > 0 ? `reduziu ${rounded}%` : `aumentou ${rounded}%`;
}

// Só entram na comparação os parâmetros que aparecem nos dois pontos — o
// que existir só de um lado fica de fora daqui (não "não comparável": esse
// rótulo é só pra quando o parâmetro existe nos dois lados mas o valor não
// dá pra interpretar numericamente, ex.: texto sem número).
export function buildBarreiraComparison(
  firstBarreiraRows: ServiceResultsSummaryRow[],
  secondBarreiraRows: ServiceResultsSummaryRow[],
): BarreiraComparisonRow[] {
  const secondByParameter = new Map(secondBarreiraRows.map((row) => [row.parameterName, row]));

  const comparisons: BarreiraComparisonRow[] = [];
  for (const firstRow of firstBarreiraRows) {
    const secondRow = secondByParameter.get(firstRow.parameterName);
    if (!secondRow) continue;

    const firstValue = parseNumericValue(firstRow.result);
    const secondValue = parseNumericValue(secondRow.result);
    const variationLabel =
      firstValue === null || secondValue === null ? 'não comparável' : describeVariation(firstValue, secondValue);

    comparisons.push({
      parameterName: firstRow.parameterName,
      firstBarreiraValue: formatValue(firstRow.result, firstRow.unit),
      secondBarreiraValue: formatValue(secondRow.result, secondRow.unit),
      variationLabel,
    });
  }
  return comparisons;
}
