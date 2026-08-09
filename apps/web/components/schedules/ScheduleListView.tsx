'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileCheck2, FileText } from 'lucide-react';
import { TableSkeleton } from '../shared/Skeleton';
import {
  Role,
  SCHEDULE_DERIVED_STATUS_COLORS,
  SCHEDULE_DERIVED_STATUS_LABELS_PT,
  ScheduleDerivedStatus,
  ScheduleDto,
  ScheduleStatus,
  ServiceResultsSummaryLatestDto,
} from '@portal-alvim/shared';
import { schedulesApi } from '../../lib/api/schedules.api';
import { serviceResultsSummaryApi } from '../../lib/api/service-results-summary.api';
import { useActiveClient } from '../../lib/auth/ActiveClientContext';
import { useCurrentUser } from '../../lib/auth/useCurrentUser';
import { FilterableHeader } from '../shared/FilterableHeader';

interface ScheduleListViewProps {
  title: string;
  emptyMessage: string;
  showNewButton?: boolean;
  // Só faz sentido lançar resultados de um serviço já realizado — por isso
  // esse link só aparece em Realizados, não em Agendamento.
  showResultsLink?: boolean;
  // Indicador de Resumo de Resultados (ver spec) — só faz sentido junto com
  // showResultsLink, e só é exibido pra quem tem acesso à ferramenta
  // (ADMIN/MANAGER, mesma regra do botão "Gerar Resumo de Resultados" em
  // /resultados). Escopo desta etapa: só Realizados, não Agendamento.
  showResultsSummaryIndicator?: boolean;
  // Editar (data, técnicos, pontos) só faz sentido pra serviços que ainda
  // vão acontecer — em Realizados não tem por que reabrir esse formulário.
  // Nunca aparece pra CLIENT de qualquer forma (só ADMIN/MANAGER editam
  // agendamento — confirmado com o usuário), independente deste valor.
  showEditLink?: boolean;
  // Filtra os agendamentos que pertencem a esta tela (Agendamento vs.
  // Realizados) — a classificação é só de exibição, os dados são os mesmos.
  filter: (schedule: ScheduleDto) => boolean;
  // 'asc' (padrão, Agendamento): os próximos primeiro. 'desc' (Realizados,
  // confirmado com o usuário): os mais recentes primeiro, mais antigos no
  // final da página.
  sortOrder?: 'asc' | 'desc';
}

function formatPeriodo(schedule: ScheduleDto): string {
  // timeZone UTC: datas sem horário são salvas à meia-noite UTC; sem isso,
  // exibiriam o dia anterior no fuso do Brasil.
  if (schedule.dateConfirmed) {
    const start = new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const end =
      schedule.endDate && schedule.endDate !== schedule.scheduledDate
        ? new Date(schedule.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : null;
    return end ? `${start} a ${end}` : start;
  }
  // Data ainda não confirmada — só o mês é conhecido, não faz sentido
  // mostrar um dia específico (sempre o dia 1).
  return new Date(schedule.scheduledDate).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

function formatPontos(schedule: ScheduleDto): string {
  if (schedule.samplingPoints.length === 0) return '-';
  return schedule.samplingPoints
    .map(
      (sp) =>
        `${sp.samplingPointName}${
          sp.compounds.length > 0
            ? ` (${sp.compounds.map((c) => (c.quantity > 1 ? `${c.name} x${c.quantity}` : c.name)).join(', ')})`
            : ''
        }`,
    )
    .join('; ');
}

// Um badge por ponto de amostragem em vez do texto corrido anterior (nome +
// todos os grupos de compostos entre parênteses, ex.: "1º Barreira
// (Siloxanos, VOCs, BTEX); 2º Barreira (...)") — ficava denso, quebrava em
// 3+ linhas e era difícil de escanear (ver especificação de consistência
// visual). Os grupos de compostos continuam disponíveis em "Resultados" do
// serviço; aqui só a contagem aparece, como um contador discreto ao lado do
// nome do ponto.
function PontosBadges({ schedule }: { schedule: ScheduleDto }) {
  if (schedule.samplingPoints.length === 0) return <>-</>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {schedule.samplingPoints.map((sp, index) => (
        <span
          key={index}
          className="badge"
          style={{ background: 'var(--color-surface-muted, #f1f5f9)', color: 'var(--color-text)' }}
        >
          {sp.samplingPointName}
          {sp.compounds.length > 0 && (
            <span style={{ color: 'var(--color-text-muted)' }}> · {sp.compounds.length}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function formatTecnicos(schedule: ScheduleDto): string {
  return schedule.technicians.length > 0 ? schedule.technicians.map((t) => t.name).join(', ') : '-';
}

// Indicador de "Resumo de Resultados" (ver spec) — evita abrir cada serviço
// e rolar até o fim da página só pra saber se já foi gerado. Fonte do dado é
// a mesma tabela que alimenta ResultsSummaryHistory dentro do serviço, só
// que agregada por scheduleId (ver service-results-summary.api.ts), sem
// duplicar nada. Clicar leva direto pra seção relevante dentro de
// /resultados: o histórico, se já existe algum resumo; o botão de gerar, se
// ainda não existe nenhum.
function ResultsSummaryIndicator({
  scheduleId,
  latest,
}: {
  scheduleId: string;
  latest: ServiceResultsSummaryLatestDto | undefined;
}) {
  const hasSummary = !!latest;
  const anchor = hasSummary ? 'resumo-resultados' : 'gerar-resumo-resultados';
  const title = hasSummary
    ? `Resumo gerado em ${new Date(latest.createdAt).toLocaleString('pt-BR')} por ${latest.generatedByName} (v${latest.version})`
    : 'Nenhum resumo gerado ainda';

  return (
    <Link
      href={`/agendamentos/${scheduleId}/resultados#${anchor}`}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: hasSummary ? '#15803d' : 'var(--color-text-muted)',
        textDecoration: 'none',
      }}
    >
      {hasSummary ? <FileCheck2 size={16} aria-hidden /> : <FileText size={16} aria-hidden />}
      {hasSummary && <span style={{ fontSize: 12 }}>v{latest.version}</span>}
    </Link>
  );
}

const columnFilterKeys = ['periodo', 'empresa', 'servico', 'pontos', 'tecnicos', 'status'] as const;
type ColumnFilterKey = (typeof columnFilterKeys)[number];
type ColumnFilters = Record<ColumnFilterKey, string>;
const emptyColumnFilters: ColumnFilters = {
  periodo: '',
  empresa: '',
  servico: '',
  pontos: '',
  tecnicos: '',
  status: '',
};
const columnFilterLabels: Record<ColumnFilterKey, string> = {
  periodo: 'Período',
  empresa: 'Empresa',
  servico: 'Serviço',
  pontos: 'Pontos',
  tecnicos: 'Técnicos',
  status: 'Status',
};

export function ScheduleListView({
  title,
  emptyMessage,
  showNewButton,
  showResultsLink,
  showResultsSummaryIndicator,
  showEditLink = true,
  filter,
  sortOrder = 'asc',
}: ScheduleListViewProps) {
  const { activeClientId } = useActiveClient();
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const canManageResultsSummary = me?.role === Role.ADMIN || me?.role === Role.MANAGER;
  const [showCancelled, setShowCancelled] = useState(false);
  // Permite que os cards do Dashboard (Cliente e Admin) cheguem direto numa
  // lista já filtrada (ex.: /agendamentos/realizados?status=CONCLUIDO) — ver
  // especificação de navegação. Só semeia na primeira renderização; depois
  // disso o filtro vira estado normal do componente.
  const searchParams = useSearchParams();
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(() => {
    const statusParam = searchParams.get('status');
    const hasValidStatus = !!statusParam && statusParam in SCHEDULE_DERIVED_STATUS_LABELS_PT;
    return hasValidStatus ? { ...emptyColumnFilters, status: statusParam as string } : emptyColumnFilters;
  });
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

  const { data, isLoading } = useQuery({
    queryKey: ['schedules', activeClientId],
    queryFn: () => schedulesApi.list(activeClientId ?? undefined),
  });

  // Uma query só pra todos os serviços da lista (não N chamadas) — igual ao
  // resto da tabela, ignora os filtros de coluna: eles só afetam quais
  // linhas aparecem, não quais serviços existem na página.
  const shouldFetchLatestSummaries = !!showResultsSummaryIndicator && canManageResultsSummary;
  const scheduleIdsForSummary = shouldFetchLatestSummaries ? (data?.map((s) => s.id) ?? []) : [];
  const { data: latestSummaries } = useQuery({
    queryKey: ['results-summary', 'latest', scheduleIdsForSummary],
    queryFn: () => serviceResultsSummaryApi.listLatestByScheduleIds(scheduleIdsForSummary),
    enabled: shouldFetchLatestSummaries && scheduleIdsForSummary.length > 0,
  });
  const latestSummaryByScheduleId = new Map((latestSummaries ?? []).map((s) => [s.scheduleId, s]));

  function updateColumnFilter(key: ColumnFilterKey, value: string) {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleFilter(key: ColumnFilterKey) {
    setOpenFilter((current) => (current === key ? null : key));
  }

  const visibleSchedules = data
    ?.filter((schedule) => showCancelled || schedule.status !== ScheduleStatus.CANCELLED)
    .filter(filter)
    .filter((schedule) => {
      const term = columnFilters.periodo.trim().toLowerCase();
      return !term || formatPeriodo(schedule).toLowerCase().includes(term);
    })
    .filter((schedule) => {
      const term = columnFilters.empresa.trim().toLowerCase();
      return !term || (schedule.clientName ?? '').toLowerCase().includes(term);
    })
    .filter((schedule) => {
      const term = columnFilters.servico.trim().toLowerCase();
      return !term || (schedule.serviceTypeName ?? '').toLowerCase().includes(term);
    })
    .filter((schedule) => {
      const term = columnFilters.pontos.trim().toLowerCase();
      return !term || formatPontos(schedule).toLowerCase().includes(term);
    })
    .filter((schedule) => {
      const term = columnFilters.tecnicos.trim().toLowerCase();
      return !term || formatTecnicos(schedule).toLowerCase().includes(term);
    })
    .filter((schedule) => !columnFilters.status || schedule.derivedStatus === columnFilters.status)
    .sort((a, b) => {
      const diff = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

  const hasActiveColumnFilters = columnFilterKeys.some((key) => columnFilters[key]);

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        {showNewButton && (
          <Link href="/agendamentos/novo" className="btn btn-primary">
            Novo agendamento
          </Link>
        )}
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        <input
          type="checkbox"
          checked={showCancelled}
          onChange={(e) => setShowCancelled(e.target.checked)}
        />
        Mostrar agendamentos cancelados
      </label>

      <div className="card">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table>
            <thead>
              <tr>
                {columnFilterKeys
                  .filter((key) => key !== 'status')
                  .map((key) => (
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
                <FilterableHeader
                  label="Status"
                  active={!!columnFilters.status}
                  isOpen={openFilter === 'status'}
                  onToggle={() => toggleFilter('status')}
                  popoverRef={popoverRef}
                >
                  <select
                    autoFocus
                    className="input"
                    style={{ width: '100%' }}
                    value={columnFilters.status}
                    onChange={(e) => updateColumnFilter('status', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {(Object.keys(SCHEDULE_DERIVED_STATUS_LABELS_PT) as ScheduleDerivedStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {SCHEDULE_DERIVED_STATUS_LABELS_PT[status]}
                        </option>
                      ),
                    )}
                  </select>
                </FilterableHeader>
                <th>
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
              {visibleSchedules?.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{formatPeriodo(schedule)}</td>
                  <td>{schedule.clientName ?? '-'}</td>
                  <td>{schedule.serviceTypeName ?? '-'}</td>
                  <td>
                    <PontosBadges schedule={schedule} />
                  </td>
                  <td>{formatTecnicos(schedule)}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: SCHEDULE_DERIVED_STATUS_COLORS[schedule.derivedStatus].background,
                        color: SCHEDULE_DERIVED_STATUS_COLORS[schedule.derivedStatus].text,
                      }}
                    >
                      {SCHEDULE_DERIVED_STATUS_LABELS_PT[schedule.derivedStatus]}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {showEditLink && !isClient && (
                        <Link href={`/agendamentos/${schedule.id}`}>Editar</Link>
                      )}
                      {showResultsLink && (
                        <Link href={`/agendamentos/${schedule.id}/resultados`}>Resultados</Link>
                      )}
                      {showResultsSummaryIndicator && canManageResultsSummary && (
                        <ResultsSummaryIndicator
                          scheduleId={schedule.id}
                          latest={latestSummaryByScheduleId.get(schedule.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleSchedules?.length === 0 && (
                <tr>
                  <td colSpan={7}>{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
