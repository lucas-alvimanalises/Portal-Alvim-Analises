'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SAMPLING_CONTROL_SOURCE_LABELS_PT,
  SamplingControlRecordDto,
  SamplingControlSource,
} from '@portal-alvim/shared';
import { samplingControlApi } from '../../../../lib/api/sampling-control.api';
import { clientsApi } from '../../../../lib/api/clients.api';
import { compoundsApi } from '../../../../lib/api/compounds.api';
import { DateInput } from '../../../../components/shared/DateInput';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

interface Filters {
  startDate: string;
  endDate: string;
  clientId: string;
  compoundName: string;
  source: string;
  search: string;
}

const EMPTY_FILTERS: Filters = {
  startDate: '',
  endDate: '',
  clientId: '',
  compoundName: '',
  source: '',
  search: '',
};

function formatDate(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Célula editável da coluna "Responsável pelo Faturamento" — único campo
// manual da tabela (data/cliente/composto/etc. são sincronizados da cadeia
// de custódia). Salva ao sair do campo, só se mudou.
function BillingCell({ record }: { record: SamplingControlRecordDto }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(record.billingResponsible ?? '');
  const [dirty, setDirty] = useState(false);

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

const COLUMNS = [
  'Data do Serviço',
  'Cliente',
  'Amostragem',
  'Identificação da Amostra',
  'N° Relatório Interno',
  'Bomba Utilizada',
  'Ponto de Amostragem',
  'Observação',
  'Responsável pelo Faturamento',
  'Origem',
];

// "Tabela de Controle de Amostras" — a planilha mestre da Alvim, agora
// alimentada automaticamente: as amostragens feitas no portal (cadeia de
// custódia aprovada) entram sozinhas; o histórico pré-portal foi importado
// da planilha antiga (ver import-sampling-control-legacy.ts). Só a coluna
// "Responsável pelo Faturamento" é digitada aqui.
export default function TabelaControleAmostrasPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const apiParams = useMemo(
    () => ({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      clientId: filters.clientId || undefined,
      compoundName: filters.compoundName || undefined,
      source: (filters.source || undefined) as SamplingControlSource | undefined,
      search: filters.search.trim() || undefined,
    }),
    [filters],
  );

  const { data: records, isLoading } = useQuery({
    queryKey: ['sampling-control', apiParams],
    queryFn: () => samplingControlApi.list(apiParams),
  });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const { data: compounds } = useQuery({ queryKey: ['compounds'], queryFn: compoundsApi.list });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link
            href="/amostras"
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            Cadeia de Custódia
          </Link>
          {' / '}Tabela de Controle de Amostras
        </h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.open(samplingControlApi.exportExcelUrl(apiParams), '_blank')}
        >
          Exportar Excel
        </button>
      </div>

      <div
        className="card"
        style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}
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
          <label>Cliente</label>
          <select
            className="input"
            value={filters.clientId}
            onChange={(e) => setFilter('clientId', e.target.value)}
          >
            <option value="">Todos</option>
            {clients
              ?.slice()
              .sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR'))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label>Amostragem</label>
          <select
            className="input"
            value={filters.compoundName}
            onChange={(e) => setFilter('compoundName', e.target.value)}
          >
            <option value="">Todas</option>
            {compounds
              ?.filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
          </select>
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
        <div className="field" style={{ flex: 1, minWidth: 180 }}>
          <label>Buscar</label>
          <input
            className="input"
            placeholder="Nº relatório, identificação, ponto, bomba..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar filtros
          </button>
        )}
      </div>

      {!isLoading && records && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: -8, marginBottom: 16 }}>
          {records.length} {records.length === 1 ? 'amostragem' : 'amostragens'}
          {hasActiveFilters ? ' (com os filtros aplicados)' : ''}
        </p>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {COLUMNS.map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records?.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} style={{ padding: 16, color: 'var(--color-text-muted)' }}>
                    Nenhuma amostragem para os filtros aplicados.
                  </td>
                </tr>
              )}
              {records?.map((record, index) => (
                <tr
                  key={record.id}
                  style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-border)' }}
                >
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    {formatDate(record.serviceDate)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{record.clientName}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{record.compoundName}</td>
                  <td style={{ padding: '8px 12px' }}>{record.sampleIdentification ?? '—'}</td>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                    {record.fieldReportNumber ?? '—'}
                  </td>
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
