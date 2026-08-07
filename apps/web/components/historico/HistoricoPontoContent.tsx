'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ANALYSIS_STATUS_LABELS_PT, COMPLIANCE_STATUS_COLORS, SampleDto } from '@portal-alvim/shared';
import { samplesApi } from '../../lib/api/samples.api';
import { plantMaintenancesApi } from '../../lib/api/plant-maintenances.api';
import { SampleResultCard } from '../results/SampleResultCard';
import { MultiSelect } from '../forms/MultiSelect';
import { TableSkeleton } from '../shared/Skeleton';
import {
  CHART_EXCLUDED_PARAMETERS,
  MaintenanceMarkerData,
  TrendPoint,
  buildMaintenanceMarkers,
  formatResultCell,
  fractionalIndexForTime,
  groupSamplesByCompound,
  parseFilterDateUtc,
  resolveChartValue,
} from '../../lib/historico/trend-helpers';

// Uma amostra do histórico — colapsada mostra só data + status; expandida
// reaproveita o mesmo SampleResultCard usado em Serviços Realizados
// (Resultados), então anexar um certificado aqui grava na mesma linha de
// Sample e aparece lá também, sem duplicar dado nenhum.
function SampleHistoryRow({ sample }: { sample: SampleDto }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6 }}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 14,
        }}
      >
        <span>
          {new Date(sample.collectionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          {sample.sampleCode && (
            <span style={{ color: 'var(--color-text-muted)' }}> — {sample.sampleCode}</span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge">{ANALYSIS_STATUS_LABELS_PT[sample.analysisStatus]}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ marginTop: 12 }}>
            <SampleResultCard sample={sample} />
          </div>
        </div>
      )}
    </div>
  );
}

// Tabela "virada": uma linha por parâmetro (composto medido), uma coluna
// por amostra/data — deixa fácil ver a tendência de um parâmetro ao longo do
// tempo, lendo a linha inteira. Ordem cronológica crescente (mais antiga à
// esquerda), diferente da lista de amostras abaixo (mais recente primeiro).
// Cor da célula vem direto de SampleResultRow.compliance (já calculado na
// aprovação do certificado, ver certificate-compliance.util.ts) — mesma
// paliação usada em ResultsTable.tsx: verde claro (Conforme), amarelo claro
// (Atenção — ex.: Siloxanos entre 0,21 e 0,3 mg Si/m³), vermelho claro (Não
// Conforme).
function ResultsTrendTable({ samples }: { samples: SampleDto[] }) {
  const chronological = [...samples].sort(
    (a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime(),
  );

  const parameterNames: string[] = [];
  chronological.forEach((sample) => {
    sample.resultRows.forEach((row) => {
      if (!parameterNames.includes(row.parameterName)) parameterNames.push(row.parameterName);
    });
  });

  if (parameterNames.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', marginBottom: 14 }}>
      <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: '6px 10px',
                borderBottom: '1px solid var(--color-border)',
                whiteSpace: 'nowrap',
              }}
            >
              Composto
            </th>
            {chronological.map((sample) => (
              <th
                key={sample.id}
                style={{
                  textAlign: 'center',
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {new Date(sample.collectionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parameterNames.map((paramName) => (
            <tr key={paramName}>
              <td
                style={{
                  padding: '6px 10px',
                  fontWeight: 600,
                  borderBottom: '1px solid var(--color-border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {paramName}
              </td>
              {chronological.map((sample) => {
                const row = sample.resultRows.find((r) => r.parameterName === paramName);
                const colors = row?.compliance ? COMPLIANCE_STATUS_COLORS[row.compliance] : null;
                return (
                  <td
                    key={sample.id}
                    style={{
                      padding: '6px 10px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--color-border)',
                      whiteSpace: 'nowrap',
                      background: colors?.background,
                      color: colors?.text,
                    }}
                  >
                    {row ? formatResultCell(row.result, row.unit) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Um gráfico de linha por parâmetro (small multiples) em vez de várias
// linhas no mesmo eixo — os parâmetros de um composto têm faixas de valor
// muito diferentes entre si (ex.: BTEX vai de "<0,03 mg/m³" até "47,3
// mg/m³"), então um eixo único esmagaria as linhas pequenas. Série única por
// gráfico: a cor da linha é só identidade (não carrega significado), a cor
// de cada ponto vem do mesmo cálculo de conformidade da tabela acima —
// assim o gráfico e a tabela contam a mesma história com o mesmo código de
// cor.
function MiniTrendChart({
  parameterName,
  points,
  maintenanceEvents = [],
}: {
  parameterName: string;
  points: TrendPoint[];
  maintenanceEvents?: MaintenanceMarkerData[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverMaintenanceId, setHoverMaintenanceId] = useState<string | null>(null);

  const width = 320;
  const height = 150;
  const padding = { top: 12, right: 14, bottom: 22, left: 14 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values, 0);
  // Eixo sempre começa em zero (dado de magnitude, nunca negativo) — só o
  // teto tem uma folga de 15% pra a linha não encostar no topo.
  const yMax = maxValue > 0 ? maxValue * 1.15 : 1;

  function xAt(index: number): number {
    return points.length > 1 ? padding.left + (index / (points.length - 1)) * plotWidth : padding.left + plotWidth / 2;
  }
  function yAt(value: number): number {
    return padding.top + plotHeight - (value / yMax) * plotHeight;
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(p.value)}`).join(' ');
  const lastPoint = points[points.length - 1];

  // Marcadores de manutenção da planta — posição interpolada entre os dois
  // pontos de dado vizinhos da data do evento (ver fractionalIndexForTime),
  // já que o eixo é espaçado por índice, não por tempo real.
  const pointTimes = points.map((p) => p.date.getTime());
  const markers = maintenanceEvents
    .map((event) => {
      const fracIndex = fractionalIndexForTime(event.date.getTime(), pointTimes);
      return fracIndex === null ? null : { event, x: xAt(fracIndex) };
    })
    .filter((m): m is { event: MaintenanceMarkerData; x: number } => m !== null);

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{parameterName}</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Gridlines horizontais — hairline, recessivas (0 e o teto) */}
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

        {/* Manutenções da planta — linha vertical tracejada + marcador
            triangular no topo, atrás dos dados de análise (referência, não
            protagonista do gráfico). Cor roxa fixa: nunca se confunde com as
            cores de conformidade (verde/amarelo/vermelho) nem com a linha
            azul da série. */}
        {markers.map(({ event, x }) => (
          <g key={event.id}>
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

        {points.length > 1 && <path d={linePath} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

        {points.map((p, i) => {
          const colors = p.compliance ? COMPLIANCE_STATUS_COLORS[p.compliance] : null;
          const fill = colors?.text ?? '#2a78d6';
          return (
            <g key={i}>
              <circle cx={xAt(i)} cy={yAt(p.value)} r={4} fill={fill} stroke="#fcfcfb" strokeWidth={2} />
              {/* Alvo de clique maior que o ponto visível — recomendação de interação */}
              <circle
                cx={xAt(i)}
                cy={yAt(p.value)}
                r={12}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}

        {/* Rótulo direto no último ponto — "linha → valor no fim" */}
        {lastPoint && (
          <text
            x={xAt(points.length - 1)}
            y={yAt(lastPoint.value) - 8}
            textAnchor="end"
            fontSize={11}
            fill="var(--color-text-muted)"
          >
            {lastPoint.rawResult}
          </text>
        )}

        {/* Datas do primeiro e último ponto só — evita poluir com muitos rótulos */}
        <text x={xAt(0)} y={height - 6} fontSize={10} fill="var(--color-text-muted)" textAnchor="start">
          {points[0].date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
        </text>
        {points.length > 1 && (
          <text
            x={xAt(points.length - 1)}
            y={height - 6}
            fontSize={10}
            fill="var(--color-text-muted)"
            textAnchor="end"
          >
            {points[points.length - 1].date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </text>
        )}
      </svg>

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
          <strong>{points[hoverIndex].rawResult}</strong>{' '}
          <span style={{ color: 'var(--color-text-muted)' }}>
            — {points[hoverIndex].date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </span>
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

// Um gráfico por parâmetro numérico do composto (ver MiniTrendChart) — pula
// parâmetros com menos de 2 pontos legíveis (não dá pra traçar tendência
// com 1 ponto só).
function ResultsTrendCharts({
  samples,
  maintenanceEvents,
}: {
  samples: SampleDto[];
  maintenanceEvents: MaintenanceMarkerData[];
}) {
  const chronological = [...samples].sort(
    (a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime(),
  );

  const compoundName = chronological[0]?.compoundName;

  const pointsByParameter = new Map<string, TrendPoint[]>();
  chronological.forEach((sample) => {
    sample.resultRows.forEach((row) => {
      if (CHART_EXCLUDED_PARAMETERS.has(row.parameterName)) return;
      const value = resolveChartValue(compoundName, row.result);
      if (value === null) return;
      const list = pointsByParameter.get(row.parameterName) ?? [];
      list.push({
        date: new Date(sample.collectionDate),
        value,
        rawResult: formatResultCell(row.result, row.unit),
        unit: row.unit,
        compliance: row.compliance,
      });
      pointsByParameter.set(row.parameterName, list);
    });
  });

  const charts = Array.from(pointsByParameter.entries()).filter(([, points]) => points.length >= 2);
  if (charts.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 10,
        marginBottom: 14,
      }}
    >
      {charts.map(([parameterName, points]) => (
        <MiniTrendChart
          key={parameterName}
          parameterName={parameterName}
          points={points}
          maintenanceEvents={maintenanceEvents}
        />
      ))}
    </div>
  );
}

// Grupo por composto — colapsado mostra só o nome + quantidade de amostras
// já realizadas; expandido mostra a tabela de tendência (ResultsTrendTable)
// e os gráficos por parâmetro (ResultsTrendCharts) e, abaixo, o histórico
// cronológico (mais recente primeiro) pra quem precisa abrir uma amostra
// específica e anexar certificado/cadeia de custódia.
function CompoundHistoryGroup({
  compoundName,
  samples,
  maintenanceEvents,
}: {
  compoundName: string;
  samples: SampleDto[];
  maintenanceEvents: MaintenanceMarkerData[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Recolhida por padrão — a tabela/gráficos de tendência já respondem à
  // pergunta mais comum ("como esse composto variou"); a lista amostra a
  // amostra só é aberta quando precisa entrar numa análise específica
  // (confirmado com o usuário).
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6 }}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        <span>{compoundName}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {samples.length} amostra{samples.length > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: '0 14px 14px',
            borderTop: '1px solid var(--color-border)',
            marginTop: 10,
          }}
        >
          <ResultsTrendTable samples={samples} />

          <ResultsTrendCharts samples={samples} maintenanceEvents={maintenanceEvents} />

          <button
            type="button"
            onClick={() => setIsSamplesOpen((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: '4px 0 10px',
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            <span style={{ fontSize: 11 }}>{isSamplesOpen ? '▲' : '▼'}</span>
            Amostras individuais
          </button>
          {isSamplesOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {samples.map((sample) => (
                <SampleHistoryRow key={sample.id} sample={sample} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HistoricoPontoContentProps {
  clientId: string;
  pointId: string;
  // Período compartilhado — um filtro só vale pra tudo que está na tela (ver
  // PeriodFilter.tsx), não um campo repetido por ponto/amostra (confirmado
  // com o usuário). Vazio = sem filtro, mostra tudo.
  startDate: string;
  endDate: string;
}

// Compostos agrupados (tabela de tendência, gráficos, amostras individuais)
// de UM ponto de amostragem, já filtrados pelo período recebido — extraído
// da página de rota (historico/[clientId]/[pointId]/page.tsx) pra também
// poder ser embutido inline na tela de comparação entre empresas (ver
// CompanyHistorySection.tsx), sem precisar navegar pra outra rota.
export function HistoricoPontoContent({ clientId, pointId, startDate, endDate }: HistoricoPontoContentProps) {
  const [selectedCompoundIds, setSelectedCompoundIds] = useState<string[]>([]);

  const { data: samples, isLoading } = useQuery({
    queryKey: ['samples', 'historico', clientId, pointId],
    queryFn: () => samplesApi.list({ clientId, samplingPointId: pointId }),
  });

  // Manutenções da planta desta empresa — evento é da empresa inteira, não
  // de um ponto de amostragem específico, então o mesmo conjunto vale pra
  // todos os gráficos abaixo (marcadores verticais, ver MiniTrendChart).
  const { data: maintenances } = useQuery({
    queryKey: ['plant-maintenances', clientId, 'markers'],
    queryFn: () => plantMaintenancesApi.list({ clientId }),
  });

  // Filtro de período: aumenta ou diminui quantas amostras entram na tabela
  // de tendência/gráficos/lista abaixo — sem período definido, mostra tudo.
  const startBound = startDate ? parseFilterDateUtc(startDate) : null;
  const endBound = endDate ? parseFilterDateUtc(endDate) : null;
  const dateFilteredSamples = (samples ?? []).filter((sample) => {
    const collected = new Date(sample.collectionDate).getTime();
    if (startBound !== null && collected < startBound) return false;
    if (endBound !== null && collected > endBound) return false;
    return true;
  });

  const dateFilteredMaintenances = (maintenances ?? []).filter((m) => {
    const date = new Date(m.date).getTime();
    if (startBound !== null && date < startBound) return false;
    if (endBound !== null && date > endBound) return false;
    return true;
  });
  const maintenanceEvents = buildMaintenanceMarkers(dateFilteredMaintenances);

  // Agrupa por composto e ordena cada grupo do mais recente pro mais antigo
  // — histórico, não agenda futura.
  const sortedGroups = groupSamplesByCompound(dateFilteredSamples).map((group) => ({
    ...group,
    samples: [...group.samples].sort(
      (a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime(),
    ),
  }));

  // Mesmo esquema da seleção de pontos (ver CompanyHistorySection): marcar
  // um composto já mostra a tabela/gráficos dele na hora, sem passo extra —
  // por padrão nenhum vem marcado, pra tela só mostrar o que foi pedido
  // (confirmado com o usuário).
  const visibleGroups = sortedGroups.filter((group) => selectedCompoundIds.includes(group.compoundId));

  return (
    <div>
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedGroups.length > 0 && (
            <MultiSelect
              options={sortedGroups.map((group) => ({ value: group.compoundId, label: group.compoundName }))}
              value={selectedCompoundIds}
              onChange={setSelectedCompoundIds}
              placeholder="Selecione os compostos..."
            />
          )}

          {visibleGroups.map((group) => (
            <CompoundHistoryGroup
              key={group.compoundId}
              compoundName={group.compoundName}
              samples={group.samples}
              maintenanceEvents={maintenanceEvents}
            />
          ))}

          {sortedGroups.length === 0 && (samples?.length ?? 0) === 0 && (
            <div className="card">
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Nenhuma amostra registrada ainda para este ponto de amostragem.
              </p>
            </div>
          )}
          {sortedGroups.length === 0 && (samples?.length ?? 0) > 0 && (
            <div className="card">
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Nenhuma amostra no período selecionado.
              </p>
            </div>
          )}
          {sortedGroups.length > 0 && visibleGroups.length === 0 && (
            <div className="card">
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Selecione ao menos um composto acima.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
