'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PendingCertificateDto } from '@portal-alvim/shared';
import { samplesApi } from '../../../lib/api/samples.api';
import { CertificateExtractionSection } from '../../../components/results/CertificateExtractionSection';
import { FilterableHeader } from '../../../components/shared/FilterableHeader';
import { TableSkeleton } from '../../../components/shared/Skeleton';

function formatServiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatTechnicianLabel(row: PendingCertificateDto): string {
  return row.technicianNames.length > 0 ? row.technicianNames.join(', ') : '-';
}

// Mesmo padrão de filtro por coluna de ScheduleListView.tsx (Realizados) —
// todos os campos aqui são texto livre (nenhum é enum), então todos usam o
// mesmo input simples de substring.
const columnFilterKeys = [
  'serviceDate',
  'clientName',
  'serviceTypeName',
  'samplingPointName',
  'compoundLabel',
  'technicianLabel',
] as const;
type ColumnFilterKey = (typeof columnFilterKeys)[number];
type ColumnFilters = Record<ColumnFilterKey, string>;
const emptyColumnFilters: ColumnFilters = {
  serviceDate: '',
  clientName: '',
  serviceTypeName: '',
  samplingPointName: '',
  compoundLabel: '',
  technicianLabel: '',
};
const columnFilterLabels: Record<ColumnFilterKey, string> = {
  serviceDate: 'Data do Serviço',
  clientName: 'Cliente',
  serviceTypeName: 'Tipo de Serviço',
  samplingPointName: 'Ponto de Amostragem',
  compoundLabel: 'Análise',
  technicianLabel: 'Técnico',
};

function matchesFilters(row: PendingCertificateDto, filters: ColumnFilters): boolean {
  const checks: [ColumnFilterKey, string][] = [
    ['serviceDate', formatServiceDate(row.serviceDate)],
    ['clientName', row.clientName],
    ['serviceTypeName', row.serviceTypeName],
    ['samplingPointName', row.samplingPointName],
    ['compoundLabel', row.compoundLabel],
    ['technicianLabel', formatTechnicianLabel(row)],
  ];
  return checks.every(([key, value]) => {
    const term = filters[key].trim().toLowerCase();
    return !term || value.toLowerCase().includes(term);
  });
}

// Consolida, de todos os serviços do sistema (sem escopo de empresa — só
// ADMIN/MANAGER/TECHNICIAN acessam, ver role-permissions.ts), toda
// amostra/análise ainda sem certificado anexado, uma linha por amostra —
// evita ter que entrar serviço por serviço em /agendamentos/:id/resultados
// pra achar o que falta. "Anexar" reaproveita o mesmo componente já usado
// lá (CertificateExtractionSection), então validação/leitura por IA e o
// próprio Sample editado são exatamente os mesmos — sem lógica nova, só
// uma visão consolidada.
export default function CertificadosPendentesPage() {
  const queryClient = useQueryClient();
  const [expandedSampleId, setExpandedSampleId] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(emptyColumnFilters);
  const [openFilter, setOpenFilter] = useState<ColumnFilterKey | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openFilter) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['pending-certificates'],
    queryFn: () => samplesApi.listPendingCertificates(),
  });

  function handleUploaded() {
    queryClient.invalidateQueries({ queryKey: ['pending-certificates'] });
    setExpandedSampleId(null);
  }

  function updateColumnFilter(key: ColumnFilterKey, value: string) {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleFilter(key: ColumnFilterKey) {
    setOpenFilter((current) => (current === key ? null : key));
  }

  // Ordenação padrão (mais antigo primeiro) já vem pronta do backend — ver
  // ListPendingCertificatesUseCase (orderBy scheduledDate asc) — os filtros
  // aqui só reduzem o conjunto, nunca reordenam.
  const visibleRows = rows?.filter((row) => matchesFilters(row, columnFilters));
  const hasActiveColumnFilters = columnFilterKeys.some((key) => columnFilters[key]);

  return (
    <div>
      <div className="page-header">
        <h1>Certificados Pendentes</h1>
      </div>

      {!isLoading && rows && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: -8, marginBottom: 16 }}>
          {rows.length} {rows.length === 1 ? 'certificado pendente' : 'certificados pendentes'}
          {hasActiveColumnFilters && visibleRows && visibleRows.length !== rows.length
            ? ` (${visibleRows.length} exibido${visibleRows.length === 1 ? '' : 's'} com os filtros aplicados)`
            : ''}
        </p>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {columnFilterKeys.map((key) => (
                  <FilterableHeader
                    key={key}
                    label={columnFilterLabels[key]}
                    active={!!columnFilters[key]}
                    isOpen={openFilter === key}
                    onToggle={() => toggleFilter(key)}
                    popoverRef={popoverRef}
                  >
                    <input
                      autoFocus
                      className="input"
                      style={{ width: '100%' }}
                      placeholder="Filtrar..."
                      value={columnFilters[key]}
                      onChange={(e) => updateColumnFilter(key, e.target.value)}
                    />
                  </FilterableHeader>
                ))}
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                  {hasActiveColumnFilters && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: 12, whiteSpace: 'nowrap' }}
                      onClick={() => setColumnFilters(emptyColumnFilters)}
                    >
                      Limpar filtros
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows?.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, color: 'var(--color-text-muted)' }}>
                    {rows && rows.length > 0
                      ? 'Nenhum resultado para os filtros aplicados.'
                      : 'Nenhum certificado pendente no momento.'}
                  </td>
                </tr>
              )}
              {visibleRows?.map((row, index) => {
                const isExpanded = expandedSampleId === row.sampleId;
                return (
                  <Fragment key={row.sampleId}>
                    <tr style={{ borderTop: index === 0 ? 'none' : '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {formatServiceDate(row.serviceDate)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>{row.clientName}</td>
                      <td style={{ padding: '10px 14px' }}>{row.serviceTypeName}</td>
                      <td style={{ padding: '10px 14px' }}>{row.samplingPointName}</td>
                      <td style={{ padding: '10px 14px' }}>{row.compoundLabel}</td>
                      <td style={{ padding: '10px 14px' }}>{formatTechnicianLabel(row)}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setExpandedSampleId(isExpanded ? null : row.sampleId)}
                          >
                            {isExpanded ? 'Fechar' : 'Anexar certificado'}
                          </button>
                          <Link
                            href={`/agendamentos/${row.scheduleId}/resultados`}
                            style={{ fontSize: 12 }}
                          >
                            Ver serviço
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: '0 14px 14px', background: 'var(--color-surface-muted, #f8fafc)' }}>
                          <CertificateExtractionSection
                            sampleId={row.sampleId}
                            hasCompound={row.hasCompound}
                            onUploaded={handleUploaded}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
