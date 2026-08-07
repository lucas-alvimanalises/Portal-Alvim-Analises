'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '../../../../components/shared/Skeleton';
import {
  MAINTENANCE_NATURE_LABELS_PT,
  MAINTENANCE_STATUS_LABELS_PT,
  MAINTENANCE_TYPE_OPTIONS,
  MaintenanceStatus,
  Role,
} from '@portal-alvim/shared';
import { clientsApi } from '../../../../lib/api/clients.api';
import { plantMaintenancesApi } from '../../../../lib/api/plant-maintenances.api';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../../lib/auth/ActiveClientContext';

const STATUS_COLORS: Record<MaintenanceStatus, { background: string; text: string }> = {
  [MaintenanceStatus.SCHEDULED]: { background: '#e0f2fe', text: '#0369a1' },
  [MaintenanceStatus.IN_PROGRESS]: { background: '#fef3c7', text: '#92400e' },
  [MaintenanceStatus.COMPLETED]: { background: '#dcfce7', text: '#166534' },
  [MaintenanceStatus.CANCELLED]: { background: '#f1f5f9', text: '#64748b' },
};

// Nível 2: histórico de manutenções da planta desta empresa, com filtros e
// botão "Nova Manutenção" — mesmo padrão de 2 níveis de Histórico
// ([clientId]/page.tsx).
export default function ManutencaoEmpresaPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const { activeClientId } = useActiveClient();

  // Mesmo cuidado do Histórico: se o CLIENT trocar de empresa no seletor do
  // topo enquanto está dentro da manutenção de outra, realinha com a URL.
  useEffect(() => {
    if (isClient && activeClientId && activeClientId !== params.clientId) {
      router.replace(`/manutencao/${activeClientId}`);
    }
  }, [isClient, activeClientId, params.clientId, router]);

  // Semeado por querystring quando se chega aqui a partir de um card do
  // Dashboard (ex.: /manutencao/{clientId}?status=SCHEDULED&year=2026&month=8)
  // — ver especificação de navegação. Só na primeira renderização.
  const searchParams = useSearchParams();
  const [year, setYear] = useState(() => searchParams.get('year') ?? '');
  const [month, setMonth] = useState(() => searchParams.get('month') ?? '');
  const [type, setType] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['plant-maintenances', params.clientId, year, month, type, status],
    queryFn: () =>
      plantMaintenancesApi.list({
        clientId: params.clientId,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        type: type || undefined,
        status: (status as MaintenanceStatus) || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plantMaintenancesApi.remove(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['plant-maintenances', params.clientId] });
    },
  });

  function typeLabel(key: string): string {
    return MAINTENANCE_TYPE_OPTIONS.find((o) => o.key === key)?.label ?? key;
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/manutencao" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Manutenção da Planta
          </Link>{' '}
          / {client?.companyName ?? '...'}
        </h1>
        <Link href={`/manutencao/${params.clientId}/nova`} className="btn btn-primary">
          Nova Manutenção
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ width: 110 }}>
            <label htmlFor="year">Ano</label>
            <input
              id="year"
              type="number"
              className="input"
              placeholder="Todos"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label htmlFor="month">Mês</label>
            <select id="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 220 }}>
            <label htmlFor="type">Equipamento/tipo</label>
            <select id="type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos</option>
              {MAINTENANCE_TYPE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 180 }}>
            <label htmlFor="status">Status</label>
            <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.values(MaintenanceStatus).map((s) => (
                <option key={s} value={s}>
                  {MAINTENANCE_STATUS_LABELS_PT[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {maintenances?.map((maintenance, index) => {
            const canDelete = !isClient || maintenance.status === MaintenanceStatus.SCHEDULED
              || maintenance.status === MaintenanceStatus.IN_PROGRESS;
            return (
              <div
                key={maintenance.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <Link
                  href={`/manutencao/${params.clientId}/${maintenance.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(maintenance.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: STATUS_COLORS[maintenance.status].background,
                        color: STATUS_COLORS[maintenance.status].text,
                      }}
                    >
                      {MAINTENANCE_STATUS_LABELS_PT[maintenance.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    {MAINTENANCE_NATURE_LABELS_PT[maintenance.nature]}
                    {maintenance.types.length > 0 && ` · ${maintenance.types.map(typeLabel).join(', ')}`}
                    {maintenance.otherType && ` · ${maintenance.otherType}`}
                  </div>
                </Link>

                {canDelete && (
                  pendingDeleteId === maintenance.id ? (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => deleteMutation.mutate(maintenance.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => setPendingDeleteId(maintenance.id)}
                    >
                      Excluir
                    </button>
                  )
                )}
              </div>
            );
          })}
          {maintenances?.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              Nenhuma manutenção registrada para os filtros selecionados.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
