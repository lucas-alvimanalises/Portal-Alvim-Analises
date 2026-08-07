'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Role, SampleDto } from '@portal-alvim/shared';
import { clientsApi } from '../../../../../lib/api/clients.api';
import { samplingPointsApi } from '../../../../../lib/api/sampling-points.api';
import { samplesApi } from '../../../../../lib/api/samples.api';
import { plantMaintenancesApi } from '../../../../../lib/api/plant-maintenances.api';
import { useCurrentUser } from '../../../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../../../lib/auth/ActiveClientContext';
import { MultiSelect } from '../../../../../components/forms/MultiSelect';
import { PeriodFilter } from '../../../../../components/historico/PeriodFilter';
import { MultiSeriesTrendTable } from '../../../../../components/historico/MultiSeriesTrendTable';
import { MultiSeriesTrendChart } from '../../../../../components/historico/MultiSeriesTrendChart';
import { TableSkeleton } from '../../../../../components/shared/Skeleton';
import {
  buildMaintenanceMarkers,
  groupSamplesByCompound,
  parseFilterDateUtc,
} from '../../../../../lib/historico/trend-helpers';

// Paleta categórica fixa (skill de dataviz) — cor por posição do ponto na
// lista COMPLETA de pontos ativos, não pela ordem em que foi marcado: assim
// desmarcar/marcar de novo em ordem diferente não repinta série nenhuma.
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

// "Comparar pontos": mescla 2+ pontos da MESMA empresa na mesma
// tabela/gráfico (sub-linha por ponto, coluna de eficiência quando são
// exatamente 2) — ver MultiSeriesTrendTable/Chart. Aditivo: a navegação de
// um ponto só (historico/:clientId/:pointId) continua igual.
export default function CompararPontosPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const { activeClientId } = useActiveClient();
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [selectedCompoundId, setSelectedCompoundId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Mesma correção usada nos níveis 2/3: sem isso, trocar de empresa no
  // seletor do topo enquanto já está comparando pontos de outra empresa não
  // teria efeito (clientId vem da URL).
  useEffect(() => {
    if (me?.role === Role.CLIENT && activeClientId && activeClientId !== params.clientId) {
      router.replace(`/historico/${activeClientId}`);
    }
  }, [me?.role, activeClientId, params.clientId, router]);

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: samplingPoints } = useQuery({
    queryKey: ['sampling-points', params.clientId],
    queryFn: () => samplingPointsApi.listByClient(params.clientId),
  });
  const activePoints = (samplingPoints ?? []).filter((p) => p.active);

  // Mesma queryKey usada em HistoricoPontoContent — reaproveita o cache do
  // React Query em vez de duplicar a chamada se o ponto já foi visto.
  const sampleQueries = useQueries({
    queries: selectedPointIds.map((pointId) => ({
      queryKey: ['samples', 'historico', params.clientId, pointId],
      queryFn: () => samplesApi.list({ clientId: params.clientId, samplingPointId: pointId }),
    })),
  });
  const isLoadingSamples = sampleQueries.some((q) => q.isLoading);

  const startBound = startDate ? parseFilterDateUtc(startDate) : null;
  const endBound = endDate ? parseFilterDateUtc(endDate) : null;
  function filterByPeriod(samples: SampleDto[]): SampleDto[] {
    return samples.filter((sample) => {
      const collected = new Date(sample.collectionDate).getTime();
      if (startBound !== null && collected < startBound) return false;
      if (endBound !== null && collected > endBound) return false;
      return true;
    });
  }

  // Manutenções da planta desta empresa — mesma empresa pra todos os pontos
  // comparados aqui, então um marcador roxo só (sem precisar diferenciar por
  // cor de série, diferente do comparativo entre empresas).
  const { data: maintenances } = useQuery({
    queryKey: ['plant-maintenances', params.clientId, 'markers'],
    queryFn: () => plantMaintenancesApi.list({ clientId: params.clientId }),
  });
  const periodFilteredMaintenances = (maintenances ?? []).filter((m) => {
    const date = new Date(m.date).getTime();
    if (startBound !== null && date < startBound) return false;
    if (endBound !== null && date > endBound) return false;
    return true;
  });
  const maintenanceEvents = buildMaintenanceMarkers(periodFilteredMaintenances);

  const pointSeriesData = selectedPointIds.map((pointId) => {
    const point = activePoints.find((p) => p.id === pointId);
    const colorIndex = activePoints.findIndex((p) => p.id === pointId);
    const queryIndex = selectedPointIds.indexOf(pointId);
    const samples = filterByPeriod(sampleQueries[queryIndex]?.data ?? []);
    return {
      id: pointId,
      label: point?.name ?? 'Ponto',
      color: SERIES_COLORS[Math.max(colorIndex, 0) % SERIES_COLORS.length],
      compoundGroups: groupSamplesByCompound(samples),
    };
  });

  // Interseção: só compostos presentes em TODAS as séries marcadas — evitar
  // que o usuário escolha um composto que só uma das séries tem dado.
  const compoundOptions =
    pointSeriesData.length === 0
      ? []
      : pointSeriesData[0].compoundGroups
          .filter((group) =>
            pointSeriesData
              .slice(1)
              .every((series) => series.compoundGroups.some((g) => g.compoundId === group.compoundId)),
          )
          .map((group) => ({ value: group.compoundId, label: group.compoundName }));

  useEffect(() => {
    if (selectedCompoundId && !compoundOptions.some((o) => o.value === selectedCompoundId)) {
      setSelectedCompoundId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compoundOptions.map((o) => o.value).join(','), selectedCompoundId]);

  const series = pointSeriesData.map((s) => ({
    id: s.id,
    label: s.label,
    color: s.color,
    samples: s.compoundGroups.find((g) => g.compoundId === selectedCompoundId)?.samples ?? [],
  }));

  const compoundName = pointSeriesData
    .flatMap((s) => s.compoundGroups)
    .find((g) => g.compoundId === selectedCompoundId)?.compoundName;

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/historico" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Histórico
          </Link>{' '}
          /{' '}
          <Link
            href={`/historico/${params.clientId}`}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            {client?.companyName ?? '...'}
          </Link>{' '}
          / Comparar pontos
        </h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Pontos de amostragem (selecione 2 ou mais)</label>
          <MultiSelect
            options={activePoints.map((p) => ({ value: p.id, label: p.name }))}
            value={selectedPointIds}
            onChange={setSelectedPointIds}
            placeholder="Selecione os pontos..."
            emptyMessage="Nenhum ponto de amostragem cadastrado para esta empresa."
          />
        </div>
      </div>

      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {selectedPointIds.length < 2 && (
        <div className="card">
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Selecione pelo menos 2 pontos acima para comparar.
          </p>
        </div>
      )}

      {selectedPointIds.length >= 2 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Composto</label>
            <select
              className="input"
              value={selectedCompoundId}
              onChange={(e) => setSelectedCompoundId(e.target.value)}
            >
              <option value="">Selecione um composto...</option>
              {compoundOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {compoundOptions.length === 0 && !isLoadingSamples && (
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Nenhum composto em comum entre os pontos selecionados (no período escolhido).
              </span>
            )}
          </div>
        </div>
      )}

      {selectedPointIds.length >= 2 && selectedCompoundId && (
        isLoadingSamples ? (
          <TableSkeleton />
        ) : (
          <>
            <MultiSeriesTrendTable series={series} columnMode="exact-date" showEfficiency={series.length === 2} />
            <MultiSeriesTrendChart
              series={series}
              columnMode="exact-date"
              compoundName={compoundName}
              maintenanceEvents={maintenanceEvents}
            />
          </>
        )
      )}
    </div>
  );
}
