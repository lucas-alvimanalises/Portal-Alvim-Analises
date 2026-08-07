'use client';

import { useState } from 'react';
import { COMPLIANCE_STATUS_COLORS, SampleDto } from '@portal-alvim/shared';
import {
  CHART_EXCLUDED_PARAMETERS,
  ComparisonColumnMode,
  MaintenanceMarkerData,
  buildRepresentativeByColumn,
  columnKeyToTime,
  columnLabelFor,
  formatResultCell,
  fractionalIndexForTime,
  resolveChartValue,
} from '../../lib/historico/trend-helpers';
import { ComparisonSeries } from './MultiSeriesTrendTable';

interface MultiSeriesTrendChartProps {
  series: ComparisonSeries[];
  columnMode: ComparisonColumnMode;
  // Mesmo composto pra todas as séries (selecionado uma vez só pro
  // comparativo inteiro) — precisa pra aplicar a regra "Siloxanos abaixo do
  // LQ conta como zero" (ver resolveChartValue).
  compoundName?: string;
  // Manutenções da(s) empresa(s) das séries em exibição — já mapeadas pelo
  // caller (cor = série correspondente, quando faz sentido distinguir, ver
  // páginas de Comparar). Mesmo conjunto entra em todos os parâmetros/
  // gráficos, igual ao HistoricoPontoContent.
  maintenanceEvents?: MaintenanceMarkerData[];
}

interface ChartPoint {
  value: number;
  rawResult: string;
  compliance: SampleDto['resultRows'][number]['compliance'];
}

// Um gráfico por parâmetro, N séries sobrepostas no mesmo eixo — faz sentido
// aqui porque é sempre o MESMO parâmetro/mesma unidade em todas as séries
// (diferente do caso já rejeitado de misturar parâmetros diferentes de BTEX
// num gráfico só). Traço tracejado a partir da 2ª série (encoding
// secundário, sugerido pelo próprio usuário) — identidade nunca depende só
// da cor. Eixo Y compartilhado entre as séries: é o ponto inteiro de
// sobrepor, senão não dá pra comparar visualmente.
function MultiParameterChart({
  parameterName,
  seriesPoints,
  columnKeys,
  columnMode,
  maintenanceEvents = [],
}: {
  parameterName: string;
  seriesPoints: { series: ComparisonSeries; pointsByColumn: Map<string, ChartPoint> }[];
  columnKeys: string[];
  columnMode: ComparisonColumnMode;
  maintenanceEvents?: MaintenanceMarkerData[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverMaintenanceId, setHoverMaintenanceId] = useState<string | null>(null);

  const width = 420;
  const height = 170;
  const padding = { top: 12, right: 14, bottom: 22, left: 14 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const allValues = seriesPoints.flatMap((s) => Array.from(s.pointsByColumn.values()).map((p) => p.value));
  const maxValue = Math.max(...allValues, 0);
  const yMax = maxValue > 0 ? maxValue * 1.15 : 1;

  function xAt(index: number): number {
    return columnKeys.length > 1
      ? padding.left + (index / (columnKeys.length - 1)) * plotWidth
      : padding.left + plotWidth / 2;
  }
  function yAt(value: number): number {
    return padding.top + plotHeight - (value / yMax) * plotHeight;
  }

  // Marcadores de manutenção — mesma lógica de interpolação do
  // MiniTrendChart, só que aqui o eixo é por coluna (mês ou data exata) em
  // vez de por amostra individual (ver columnKeyToTime).
  const columnTimes = columnKeys.map((key) => columnKeyToTime(key, columnMode));
  const markers = maintenanceEvents
    .map((event) => {
      const fracIndex = fractionalIndexForTime(event.date.getTime(), columnTimes);
      return fracIndex === null ? null : { event, x: xAt(fracIndex) };
    })
    .filter((m): m is { event: MaintenanceMarkerData; x: number } => m !== null);

  // Quebra a linha em segmentos contínuos onde a série tem dado — nunca
  // conecta por cima de uma coluna sem valor (isso mentiria sobre o dado).
  function pathsFor(pointsByColumn: Map<string, ChartPoint>): string[] {
    const runs: string[] = [];
    let runPoints: string[] = [];
    columnKeys.forEach((key, i) => {
      const point = pointsByColumn.get(key);
      if (point) {
        runPoints.push(`${runPoints.length === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(point.value)}`);
      } else if (runPoints.length > 0) {
        runs.push(runPoints.join(' '));
        runPoints = [];
      }
    });
    if (runPoints.length > 0) runs.push(runPoints.join(' '));
    return runs;
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{parameterName}</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {[0, yMax].map((tickValue) => (
          <line
            key={tickValue}
            x1={padding.left}
            x2={width - padding.right}
            y1={yAt(tickValue)}
            y2={yAt(tickValue)}
            stroke="#e1e0d9"
            strokeWidth={1}
          />
        ))}

        {/* Manutenções da planta — atrás das séries de dado (referência, não
            protagonista). Cor roxa fixa, a menos que o caller já tenha
            atribuído a cor da série correspondente (comparar empresas). */}
        {markers.map(({ event, x }) => (
          <g key={`${event.id}-${parameterName}`}>
            <line
              x1={x}
              x2={x}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke={event.color ?? '#7c3aed'}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <polygon
              points={`${x - 5},${padding.top} ${x + 5},${padding.top} ${x},${padding.top + 8}`}
              fill={event.color ?? '#7c3aed'}
            />
            <circle
              cx={x}
              cy={padding.top + 2}
              r={9}
              fill="transparent"
              onMouseEnter={() => setHoverMaintenanceId(event.id)}
              onMouseLeave={() => setHoverMaintenanceId((current) => (current === event.id ? null : current))}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {seriesPoints.map(({ series, pointsByColumn }, seriesIndex) => (
          <g key={series.id}>
            {pathsFor(pointsByColumn).map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={series.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={seriesIndex > 0 ? '6 4' : undefined}
              />
            ))}
            {columnKeys.map((key, i) => {
              const point = pointsByColumn.get(key);
              if (!point) return null;
              const colors = point.compliance ? COMPLIANCE_STATUS_COLORS[point.compliance] : null;
              return (
                <g key={key}>
                  <circle cx={xAt(i)} cy={yAt(point.value)} r={4} fill={colors?.text ?? series.color} stroke="#fcfcfb" strokeWidth={2} />
                  <circle
                    cx={xAt(i)}
                    cy={yAt(point.value)}
                    r={12}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              );
            })}
          </g>
        ))}

        <text x={xAt(0)} y={height - 6} fontSize={10} fill="var(--color-text-muted)" textAnchor="start">
          {columnLabelFor(columnKeys[0], columnMode)}
        </text>
        {columnKeys.length > 1 && (
          <text
            x={xAt(columnKeys.length - 1)}
            y={height - 6}
            fontSize={10}
            fill="var(--color-text-muted)"
            textAnchor="end"
          >
            {columnLabelFor(columnKeys[columnKeys.length - 1], columnMode)}
          </text>
        )}
      </svg>

      {/* Legenda — sempre presente com 2+ séries (identidade nunca só por cor). */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
        {seriesPoints.map(({ series }, seriesIndex) => (
          <span key={series.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
            <svg width="16" height="8">
              <line
                x1={0}
                y1={4}
                x2={16}
                y2={4}
                stroke={series.color}
                strokeWidth={2}
                strokeDasharray={seriesIndex > 0 ? '4 3' : undefined}
              />
            </svg>
            {series.label}
          </span>
        ))}
      </div>

      {/* Um tooltip só, com todas as séries daquela coluna — não precisa
          acertar a linha exata pra ver o valor. */}
      {hoverIndex !== null && (
        <div
          style={{
            fontSize: 12,
            marginTop: 4,
            padding: '4px 8px',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>
            {columnLabelFor(columnKeys[hoverIndex], columnMode)}
          </div>
          {seriesPoints.map(({ series, pointsByColumn }) => {
            const point = pointsByColumn.get(columnKeys[hoverIndex]);
            return (
              <div key={series.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 2, background: series.color }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{series.label}:</span>
                <strong>{point ? point.rawResult : '-'}</strong>
              </div>
            );
          })}
        </div>
      )}

      {hoverMaintenanceId !== null && (
        <div
          style={{
            fontSize: 12,
            marginTop: 4,
            padding: '4px 8px',
            border: '1px solid #d8b4fe',
            borderRadius: 4,
            background: '#f5f3ff',
            color: '#5b21b6',
          }}
        >
          {(() => {
            const event = markers.find((m) => m.event.id === hoverMaintenanceId)?.event;
            if (!event) return null;
            return (
              <>
                <strong>Manutenção — {event.label}</strong>{' '}
                <span>({event.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })})</span>
                <div>{event.detail}</div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export function MultiSeriesTrendChart({
  series,
  columnMode,
  compoundName,
  maintenanceEvents = [],
}: MultiSeriesTrendChartProps) {
  const representativeByColumnBySeries = series.map((s) => ({
    series: s,
    map: buildRepresentativeByColumn(s.samples, columnMode),
  }));

  const columnKeys = Array.from(
    new Set(representativeByColumnBySeries.flatMap(({ map }) => Array.from(map.keys()))),
  ).sort();

  const parameterNames = Array.from(
    new Set(
      representativeByColumnBySeries.flatMap(({ map }) =>
        Array.from(map.values()).flatMap((sample) => sample.resultRows.map((r) => r.parameterName)),
      ),
    ),
  ).filter((name) => !CHART_EXCLUDED_PARAMETERS.has(name));

  const charts = parameterNames
    .map((parameterName) => {
      const seriesPoints = representativeByColumnBySeries.map(({ series: s, map }) => {
        const pointsByColumn = new Map<string, ChartPoint>();
        map.forEach((sample, key) => {
          const row = sample.resultRows.find((r) => r.parameterName === parameterName);
          if (!row) return;
          const value = resolveChartValue(compoundName, row.result);
          if (value === null) return;
          pointsByColumn.set(key, {
            value,
            rawResult: formatResultCell(row.result, row.unit),
            compliance: row.compliance,
          });
        });
        return { series: s, pointsByColumn };
      });
      const totalPoints = seriesPoints.reduce((sum, s) => sum + s.pointsByColumn.size, 0);
      return { parameterName, seriesPoints, totalPoints };
    })
    .filter((chart) => chart.totalPoints >= 2);

  if (charts.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 10,
        marginBottom: 14,
      }}
    >
      {charts.map(({ parameterName, seriesPoints }) => (
        <MultiParameterChart
          key={parameterName}
          parameterName={parameterName}
          seriesPoints={seriesPoints}
          columnKeys={columnKeys}
          columnMode={columnMode}
          maintenanceEvents={maintenanceEvents}
        />
      ))}
    </div>
  );
}
