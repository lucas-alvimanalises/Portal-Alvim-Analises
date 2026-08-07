'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Role, SampleDto } from '@portal-alvim/shared';
import { clientsApi } from '../../../../lib/api/clients.api';
import { samplingPointsApi } from '../../../../lib/api/sampling-points.api';
import { samplesApi } from '../../../../lib/api/samples.api';
import { plantMaintenancesApi } from '../../../../lib/api/plant-maintenances.api';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../../lib/auth/ActiveClientContext';
import { MultiSelect } from '../../../../components/forms/MultiSelect';
import { PeriodFilter } from '../../../../components/historico/PeriodFilter';
import { MultiSeriesTrendTable } from '../../../../components/historico/MultiSeriesTrendTable';
import { MultiSeriesTrendChart } from '../../../../components/historico/MultiSeriesTrendChart';
import { TableSkeleton } from '../../../../components/shared/Skeleton';
import {
  buildMaintenanceMarkers,
  groupSamplesByCompound,
  parseFilterDateUtc,
} from '../../../../lib/historico/trend-helpers';

// Mesma paleta fixa usada em "Comparar pontos" — cor por posição na lista
// completa de empresas disponíveis pro papel (não pela ordem de seleção).
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

// "Comparar empresas": mesmo tipo de ponto (via SamplingPoint.standardId —
// cada empresa nomeia seus pontos do jeito dela, mas os comparáveis
// compartilham o mesmo padrão, ver seed.ts) e mesmo composto, mesclados na
// mesma tabela/gráfico — sem coluna de eficiência (não existe relação
// antes/depois entre duas empresas). Cliente só pode marcar empresas
// vinculadas a ele mesmo (mesma fonte do seletor "Empresa:" do topo); Admin/
// Gestor pode marcar qualquer empresa ativa.
export default function CompararEmpresasPage() {
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const { companies: myCompanies } = useActiveClient();

  const { data: allActiveCompanies } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.list,
    enabled: me !== undefined && !isClient,
  });

  const availableCompanies = isClient
    ? myCompanies
    : (allActiveCompanies ?? []).filter((c) => c.status === 'ACTIVE');

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState('');
  const [selectedCompoundId, setSelectedCompoundId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const pointQueries = useQueries({
    queries: selectedCompanyIds.map((companyId) => ({
      queryKey: ['sampling-points', companyId],
      queryFn: () => samplingPointsApi.listByClient(companyId),
    })),
  });
  const isLoadingPoints = pointQueries.some((q) => q.isLoading);

  const companyPoints = selectedCompanyIds.map((companyId, index) => ({
    companyId,
    points: (pointQueries[index]?.data ?? []).filter((p) => p.active && p.standardId),
  }));

  // Interseção: só "tipos de ponto" (standardId) presentes em TODAS as
  // empresas marcadas — evita escolher um tipo que só uma delas tem.
  const standardOptions: { value: string; label: string }[] = [];
  if (companyPoints.length > 0) {
    companyPoints[0].points.forEach((point) => {
      if (standardOptions.some((o) => o.value === point.standardId)) return;
      const presentInAll = companyPoints
        .slice(1)
        .every((cp) => cp.points.some((p) => p.standardId === point.standardId));
      if (presentInAll) {
        standardOptions.push({ value: point.standardId!, label: point.standardName ?? point.name });
      }
    });
  }

  useEffect(() => {
    if (selectedStandardId && !standardOptions.some((o) => o.value === selectedStandardId)) {
      setSelectedStandardId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standardOptions.map((o) => o.value).join(','), selectedStandardId]);

  // Ponto de cada empresa que corresponde ao tipo escolhido — primeiro ativo
  // se houver mais de um com o mesmo standardId (sem constraint de
  // unicidade no schema).
  function resolvePointId(companyId: string): string | undefined {
    const cp = companyPoints.find((c) => c.companyId === companyId);
    return cp?.points.find((p) => p.standardId === selectedStandardId)?.id;
  }

  const sampleQueries = useQueries({
    queries: selectedCompanyIds.map((companyId) => {
      const pointId = resolvePointId(companyId);
      return {
        queryKey: ['samples', 'historico', companyId, pointId ?? 'none'],
        queryFn: () => samplesApi.list({ clientId: companyId, samplingPointId: pointId }),
        enabled: !!pointId,
      };
    }),
  });
  const isLoadingSamples = sampleQueries.some((q) => q.isLoading || q.isPending) && !!selectedStandardId;

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

  const companySeriesData = selectedCompanyIds.map((companyId, index) => {
    const company = availableCompanies.find((c) => c.id === companyId);
    const colorIndex = availableCompanies.findIndex((c) => c.id === companyId);
    const samples = filterByPeriod(sampleQueries[index]?.data ?? []);
    return {
      id: companyId,
      label: company?.companyName ?? 'Empresa',
      color: SERIES_COLORS[Math.max(colorIndex, 0) % SERIES_COLORS.length],
      compoundGroups: groupSamplesByCompound(samples),
    };
  });

  // Manutenções por empresa — uma consulta por empresa marcada (mesmo padrão
  // de sampleQueries/pointQueries acima), cada marcador pintado com a MESMA
  // cor da série daquela empresa no gráfico, pra dar pra saber de qual
  // empresa é o evento sem abrir o tooltip.
  const maintenanceQueries = useQueries({
    queries: selectedCompanyIds.map((companyId) => ({
      queryKey: ['plant-maintenances', companyId, 'markers'],
      queryFn: () => plantMaintenancesApi.list({ clientId: companyId }),
    })),
  });
  const maintenanceEvents = selectedCompanyIds.flatMap((companyId, index) => {
    const colorIndex = availableCompanies.findIndex((c) => c.id === companyId);
    const color = SERIES_COLORS[Math.max(colorIndex, 0) % SERIES_COLORS.length];
    const periodFiltered = (maintenanceQueries[index]?.data ?? []).filter((m) => {
      const date = new Date(m.date).getTime();
      if (startBound !== null && date < startBound) return false;
      if (endBound !== null && date > endBound) return false;
      return true;
    });
    return buildMaintenanceMarkers(periodFiltered, color);
  });

  const compoundOptions =
    companySeriesData.length === 0
      ? []
      : companySeriesData[0].compoundGroups
          .filter((group) =>
            companySeriesData
              .slice(1)
              .every((s) => s.compoundGroups.some((g) => g.compoundId === group.compoundId)),
          )
          .map((group) => ({ value: group.compoundId, label: group.compoundName }));

  useEffect(() => {
    if (selectedCompoundId && !compoundOptions.some((o) => o.value === selectedCompoundId)) {
      setSelectedCompoundId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compoundOptions.map((o) => o.value).join(','), selectedCompoundId]);

  const series = companySeriesData.map((s) => ({
    id: s.id,
    label: s.label,
    color: s.color,
    samples: s.compoundGroups.find((g) => g.compoundId === selectedCompoundId)?.samples ?? [],
  }));

  const compoundName = companySeriesData
    .flatMap((s) => s.compoundGroups)
    .find((g) => g.compoundId === selectedCompoundId)?.compoundName;

  if (isClient && myCompanies.length <= 1) {
    return (
      <div>
        <div className="page-header">
          <h1>Comparar empresas</h1>
        </div>
        <div className="card">
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Você não tem outra empresa vinculada para comparar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/historico" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Histórico
          </Link>{' '}
          / Comparar empresas
        </h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Empresas (selecione 2 ou mais)</label>
          <MultiSelect
            options={availableCompanies.map((c) => ({ value: c.id, label: c.companyName }))}
            value={selectedCompanyIds}
            onChange={setSelectedCompanyIds}
            placeholder="Selecione as empresas..."
          />
        </div>
      </div>

      {selectedCompanyIds.length < 2 && (
        <div className="card">
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Selecione pelo menos 2 empresas acima para comparar.
          </p>
        </div>
      )}

      {selectedCompanyIds.length >= 2 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Tipo de ponto de amostragem</label>
            <select
              className="input"
              value={selectedStandardId}
              onChange={(e) => setSelectedStandardId(e.target.value)}
            >
              <option value="">Selecione um tipo de ponto...</option>
              {standardOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {standardOptions.length === 0 && !isLoadingPoints && (
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Nenhum tipo de ponto em comum entre as empresas selecionadas.
              </span>
            )}
          </div>
        </div>
      )}

      {selectedStandardId && (
        <>
          <PeriodFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

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
                  Nenhum composto em comum entre as empresas selecionadas (no período escolhido).
                </span>
              )}
            </div>
          </div>

          {selectedCompoundId &&
            (isLoadingSamples ? (
              <TableSkeleton />
            ) : (
              <>
                <MultiSeriesTrendTable series={series} columnMode="month" showEfficiency={false} />
                <MultiSeriesTrendChart
                  series={series}
                  columnMode="month"
                  compoundName={compoundName}
                  maintenanceEvents={maintenanceEvents}
                />
              </>
            ))}
        </>
      )}
    </div>
  );
}
