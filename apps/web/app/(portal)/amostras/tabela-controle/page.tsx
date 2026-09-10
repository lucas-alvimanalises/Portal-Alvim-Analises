'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ListSamplingControlParams,
  matchesSamplingControlFilters,
  SAMPLING_CONTROL_SOURCE_LABELS_PT,
  SamplingControlRecordDto,
  SamplingControlSource,
} from '@portal-alvim/shared';
import { samplingControlApi } from '../../../../lib/api/sampling-control.api';
import { DateInput } from '../../../../components/shared/DateInput';
import { FilterableHeader } from '../../../../components/shared/FilterableHeader';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

// Colunas com filtro por texto (substring, no backend). Data e Origem ficam
// no filtro do topo (intervalo / enum), fora deste conjunto.
const TEXT_COLUMNS = [
  { key: 'clientName', label: 'Cliente' },
  { key: 'compoundName', label: 'Amostragem' },
  { key: 'sampleIdentification', label: 'Identificação da Amostra' },
  { key: 'fieldReportNumber', label: 'N° Relatório Interno' },
  { key: 'pump', label: 'Bomba Utilizada' },
  { key: 'samplingPointName', label: 'Ponto de Amostragem' },
  { key: 'observation', label: 'Observação' },
  { key: 'billingResponsible', label: 'Responsável pelo Faturamento' },
] as const;

type TextColumnKey = (typeof TEXT_COLUMNS)[number]['key'];

interface Filters {
  startDate: string;
  endDate: string;
  source: string;
  clientName: string;
  compoundName: string;
  sampleIdentification: string;
  fieldReportNumber: string;
  pump: string;
  samplingPointName: string;
  observation: string;
  billingResponsible: string;
}

const EMPTY_FILTERS: Filters = {
  startDate: '',
  endDate: '',
  source: '',
  clientName: '',
  compoundName: '',
  sampleIdentification: '',
  fieldReportNumber: '',
  pump: '',
  samplingPointName: '',
  observation: '',
  billingResponsible: '',
};

function filtersToParams(f: Filters): ListSamplingControlParams {
  return {
    startDate: f.startDate || undefined,
    endDate: f.endDate || undefined,
    source: (f.source || undefined) as SamplingControlSource | undefined,
    clientName: f.clientName.trim() || undefined,
    compoundName: f.compoundName.trim() || undefined,
    sampleIdentification: f.sampleIdentification.trim() || undefined,
    fieldReportNumber: f.fieldReportNumber.trim() || undefined,
    pump: f.pump.trim() || undefined,
    samplingPointName: f.samplingPointName.trim() || undefined,
    observation: f.observation.trim() || undefined,
    billingResponsible: f.billingResponsible.trim() || undefined,
  };
}

function formatDate(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Célula editável da coluna "Responsável pelo Faturamento" — único campo
// manual da tabela (o resto é sincronizado da cadeia de custódia). Salva ao
// sair do campo, só se mudou.
function BillingCell({ record }: { record: SamplingControlRecordDto }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(record.billingResponsible ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(record.billingResponsible ?? '');
    setDirty(false);
  }, [record.billingResponsible]);

  const mutation = useMutation({
    mutationFn: (billingResponsible: string) =>
      samplingControlApi.update(record.id, { billingResponsible: billingResponsible || null }),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['sampling-control'] });
    },
  });

  function commit() {
    const trimmed = value.trim();
    if (trimmed === (record.billingResponsible ?? '')) {
      setDirty(false);
      return;
    }
    mutation.mutate(trimmed);
  }

  return (
    <input
      className="input"
      style={{
        width: '100%',
        fontSize: 12,
        padding: '4px 6px',
        background: dirty ? 'var(--color-primary-soft)' : 'transparent',
        border: dirty ? '1px solid var(--color-primary)' : '1px solid transparent',
      }}
      value={value}
      placeholder="—"
      disabled={mutation.isPending}
      onChange={(e) => {
        setValue(e.target.value);
        setDirty(true);
      }}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setValue(record.billingResponsible ?? '');
          setDirty(false);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

// "Tabela de Controle de Amostras" — a planilha mestre da Alvim, agora
// alimentada automaticamente: amostragens feitas no portal (cadeia de
// custódia aprovada) entram sozinhas; o histórico pré-portal foi importado
// da planilha antiga. Só "Responsável pelo Faturamento" é digitado aqui.
export default function TabelaControleAmostrasPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openFilter, setOpenFilter] = useState<TextColumnKey | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openFilter) return;
    function onClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [openFilter]);

  const params = useMemo(() => filtersToParams(filters), [filters]);

  // A tabela inteira vem numa consulta só (~2 mil linhas, cacheada); os
  // filtros rodam no cliente (mesma função do export, ver shared).
  const { data: allRecords, isLoading } = useQuery({
    queryKey: ['sampling-control'],
    queryFn: () => samplingControlApi.list(),
  });

  const records = useMemo(
    () => (allRecords ?? []).filter((r) => matchesSamplingControlFilters(r, params)),
    [allRecords, params],
  );

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/amostras" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Cadeia de Custódia
          </Link>
          {' / '}Tabela de Controle de Amostras
        </h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.open(samplingControlApi.exportExcelUrl(params), '_blank')}
        >
          Exportar Excel
        </button>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}
      >
        <div className="field">
          <label>De</label>
          <DateInput value={filters.startDate} onChange={(v) => setFilter('startDate', v)} />
        </div>
        <div className="field">
          <label>Até</label>
          <DateInput value={filters.endDate} onChange={(v) => setFilter('endDate', v)} />
        </div>
        <div className="field">
          <label>Origem</label>
          <select
            className="input"
            value={filters.source}
            onChange={(e) => setFilter('source', e.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(SAMPLING_CONTROL_SOURCE_LABELS_PT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar filtros
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-text-muted)' }}>
          {isLoading
            ? 'Carregando…'
            : hasActiveFilters
              ? `${records.length} de ${allRecords?.length ?? 0} amostragens`
              : `${records.length} amostragens`}
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={thStyle}>Data do Serviço</th>
                {TEXT_COLUMNS.map((col) => (
                  <FilterableHeader
                    key={col.key}
                    label={col.label}
                    active={!!filters[col.key]}
                    isOpen={openFilter === col.key}
                    onToggle={() => setOpenFilter((c) => (c === col.key ? null : col.key))}
                    popoverRef={popoverRef}
                  >
                    <input
                      autoFocus
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="Filtrar..."
                      value={filters[col.key]}
                      onChange={(e) => setFilter(col.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') setOpenFilter(null);
                      }}
                    />
                    {filters[col.key] && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: 6, fontSize: 12, padding: '3px 0' }}
                        onClick={() => setFilter(col.key, '')}
                      >
                        Limpar
                      </button>
                    )}
                  </FilterableHeader>
                ))}
                <th style={thStyle}>Origem</th>
              </tr>
            </thead>
            <tbody>
              {records?.length === 0 && (
                <tr>
                  <td colSpan={TEXT_COLUMNS.length + 2} style={{ padding: 16, color: 'var(--color-text-muted)' }}>
                    Nenhuma amostragem para os filtros aplicados.
                  </td>
                </tr>
              )}
              {records?.map((record, index) => (
                <tr
                  key={record.id}
                  // Zebra branca/cinza igual à planilha, pra diferenciar as
                  // linhas de relance (usa surface-muted, que também funciona
                  // no modo escuro).
                  style={{
                    background: index % 2 === 1 ? 'var(--color-surface-muted)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDate(record.serviceDate)}</td>
                  <td style={{ padding: '8px 12px' }}>{record.clientName}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{record.compoundName}</td>
                  <td style={{ padding: '8px 12px' }}>{record.sampleIdentification ?? '—'}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{record.fieldReportNumber ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{record.pump ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{record.samplingPointName ?? '—'}</td>
                  <td style={{ padding: '8px 12px', maxWidth: 260 }}>{record.observation ?? '—'}</td>
                  <td style={{ padding: '4px 8px', minWidth: 200 }}>
                    <BillingCell record={record} />
                  </td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                    {SAMPLING_CONTROL_SOURCE_LABELS_PT[record.source]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
};
