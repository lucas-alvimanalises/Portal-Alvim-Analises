'use client';

import { Fragment } from 'react';
import { ComplianceStatus, SampleDto } from '@portal-alvim/shared';
import {
  CHART_EXCLUDED_PARAMETERS,
  ComparisonColumnMode,
  buildRepresentativeByColumn,
  columnLabelFor,
  formatResultCell,
  parseNumericValue,
  COMPLIANCE_SEVERITY,
} from '../../lib/historico/trend-helpers';

export interface ComparisonSeries {
  id: string;
  label: string;
  color: string;
  // Já filtradas por período e composto pelo caller — este componente não
  // sabe nada sobre "composto", só monta linhas a partir dos resultRows que
  // recebe (mesmo padrão de ResultsTrendTable.tsx).
  samples: SampleDto[];
}

interface MultiSeriesTrendTableProps {
  series: ComparisonSeries[];
  // 'exact-date': coluna por data de coleta exata (pontos da mesma empresa —
  // confirmado no banco que as visitas batem no mesmo dia entre pontos).
  // 'month': coluna por mês (empresas diferentes nunca coincidem por dia).
  columnMode: ComparisonColumnMode;
  // Só faz sentido com exatamente 2 séries — a referência é sempre
  // series[0] (a primeira marcada pelo usuário, ver MultiSelect). O caller
  // decide quando mostrar (nunca no modo "Comparar empresas").
  showEfficiency: boolean;
}

type CellValue = { result: string; unit: string; compliance: ComplianceStatus | null };

function cellValueFor(sample: SampleDto | undefined, parameterName: string): CellValue | null {
  const row = sample?.resultRows.find((r) => r.parameterName === parameterName);
  if (!row) return null;
  return { result: row.result, unit: row.unit, compliance: row.compliance };
}

// Eficiência (%) entre a série de referência (series[0]) e a de comparação,
// nessa coluna — nunca lança exceção pra valor ausente/zero/abaixo do LQ,
// só mostra "-". O destaque piorou/melhorou compara a SEVERIDADE de
// conformidade (não o valor bruto): parâmetros com faixa (ex.: COG, 15 a 30
// mg/m³) podem piorar tanto subindo quanto descendo — comparar só o número
// erraria esse caso (ver certificate-compliance.util.ts, regulatoryMin).
function computeEfficiency(
  reference: CellValue | null,
  comparison: CellValue | null,
): { text: string; highlight: 'worse' | 'better' | null } {
  if (!reference || !comparison) return { text: '-', highlight: null };
  if (reference.result.includes('<') || comparison.result.includes('<')) {
    return { text: '-', highlight: null };
  }
  const refValue = parseNumericValue(reference.result);
  const otherValue = parseNumericValue(comparison.result);
  if (refValue === null || otherValue === null || refValue === 0) {
    return { text: '-', highlight: null };
  }
  const pct = ((refValue - otherValue) / refValue) * 100;
  const text = `${pct.toFixed(1)}%`;

  let highlight: 'worse' | 'better' | null = null;
  if (reference.compliance && comparison.compliance) {
    const refSeverity = COMPLIANCE_SEVERITY[reference.compliance];
    const otherSeverity = COMPLIANCE_SEVERITY[comparison.compliance];
    if (otherSeverity > refSeverity) highlight = 'worse';
    else if (otherSeverity < refSeverity) highlight = 'better';
  }
  return { text, highlight };
}

// Status palette do skill de dataviz (fixa, nunca reaproveitada por série) —
// só aparece com ícone + texto, nunca só a cor.
const EFFICIENCY_HIGHLIGHT_STYLE: Record<'worse' | 'better', { background: string; text: string; icon: string; label: string }> = {
  worse: { background: '#fbe4e4', text: '#d03b3b', icon: '▲', label: 'piorou' },
  better: { background: '#e1f5e1', text: '#0ca30c', icon: '▼', label: 'melhorou' },
};

export function MultiSeriesTrendTable({ series, columnMode, showEfficiency }: MultiSeriesTrendTableProps) {
  const representativeByColumnBySeries = series.map((s) => buildRepresentativeByColumn(s.samples, columnMode));

  const columnKeys = Array.from(
    new Set(representativeByColumnBySeries.flatMap((map) => Array.from(map.keys()))),
  ).sort();

  const parameterNames = Array.from(
    new Set(
      representativeByColumnBySeries.flatMap((map) =>
        Array.from(map.values()).flatMap((sample) => sample.resultRows.map((r) => r.parameterName)),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const showEfficiencyColumn = showEfficiency && series.length === 2;

  if (parameterNames.length === 0 || columnKeys.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Nenhum dado para comparar com os filtros atuais.
        </p>
      </div>
    );
  }

  // "Volume Amostrado" e afins não são medida de concentração — eficiência
  // não faz sentido pra eles (mesmo critério do gráfico, ver
  // CHART_EXCLUDED_PARAMETERS). A tabela de valores continua mostrando
  // normalmente, só a linha de eficiência pula.
  function showsEfficiencyFor(paramName: string): boolean {
    return showEfficiencyColumn && !CHART_EXCLUDED_PARAMETERS.has(paramName);
  }

  return (
    <div style={{ overflowX: 'auto', marginBottom: 14 }}>
      <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
              Composto
            </th>
            <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
              Série
            </th>
            {columnKeys.map((key) => (
              <th
                key={key}
                style={{
                  textAlign: 'center',
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {columnLabelFor(key, columnMode)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parameterNames.map((paramName) => {
            const cellsBySeries = representativeByColumnBySeries.map((map) =>
              columnKeys.map((key) => cellValueFor(map.get(key), paramName)),
            );
            const rowsPerParameter = series.length + (showsEfficiencyFor(paramName) ? 1 : 0);
            return (
              <Fragment key={paramName}>
                {series.map((s, seriesIndex) => (
                  <tr key={`${paramName}-${s.id}`}>
                    {seriesIndex === 0 && (
                      <td
                        rowSpan={rowsPerParameter}
                        style={{
                          padding: '6px 10px',
                          fontWeight: 600,
                          borderBottom: '1px solid var(--color-border)',
                          borderTop: '2px solid var(--color-border)',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'top',
                        }}
                      >
                        {paramName}
                      </td>
                    )}
                    <td
                      style={{
                        padding: '6px 10px',
                        borderBottom: '1px solid var(--color-border)',
                        borderTop: seriesIndex === 0 ? '2px solid var(--color-border)' : undefined,
                        whiteSpace: 'nowrap',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: s.color,
                          marginRight: 6,
                        }}
                      />
                      {s.label}
                    </td>
                    {columnKeys.map((key, colIndex) => {
                      const cell = cellsBySeries[seriesIndex][colIndex];
                      return (
                        <td
                          key={key}
                          style={{
                            padding: '6px 10px',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--color-border)',
                            borderTop: seriesIndex === 0 ? '2px solid var(--color-border)' : undefined,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cell ? formatResultCell(cell.result, cell.unit) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {showsEfficiencyFor(paramName) && (
                  <tr key={`${paramName}-eficiencia`}>
                    <td
                      style={{
                        padding: '6px 10px',
                        borderBottom: '1px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                        fontStyle: 'italic',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Eficiência (%)
                    </td>
                    {columnKeys.map((key, colIndex) => {
                      const { text, highlight } = computeEfficiency(
                        cellsBySeries[0][colIndex],
                        cellsBySeries[1][colIndex],
                      );
                      const style = highlight ? EFFICIENCY_HIGHLIGHT_STYLE[highlight] : null;
                      return (
                        <td
                          key={key}
                          style={{
                            padding: '6px 10px',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--color-border)',
                            whiteSpace: 'nowrap',
                            background: style?.background,
                            color: style?.text,
                            fontStyle: 'italic',
                          }}
                        >
                          {style ? `${style.icon} ` : ''}
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {showEfficiencyColumn && (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
          Eficiência = (valor de <strong>{series[0].label}</strong> − valor de{' '}
          <strong>{series[1].label}</strong>) ÷ valor de {series[0].label} × 100. ▲ piorou / ▼ melhorou
          comparam a situação (Conforme/Atenção/Não Conforme) entre as duas séries no mesmo período.
        </p>
      )}
    </div>
  );
}
