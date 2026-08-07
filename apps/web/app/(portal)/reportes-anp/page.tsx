'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { anpMonthlyReportsApi } from '../../../lib/api/anp-monthly-reports.api';
import { useCurrentUser } from '../../../lib/auth/useCurrentUser';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Badge da lista de empresas (nível 1) — não é o mesmo status ✅/⏳/❌ por
// mês usado na grade de nível 2 (ANP_MONTH_STATUS_*). Aqui é um resumo por
// empresa: "tem algum mês (não só o corrente) com dados prontos e sem
// reporte gerado?" — ver AnpEligibleClientDto.hasPendingReports.
const ELIGIBLE_CLIENT_BADGE = {
  pending: { background: '#fef9c3', text: '#854d0e', label: 'Liberar Reportes' },
  upToDate: { background: '#dbeafe', text: '#1e40af', label: 'Tudo liberado' },
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// Nível 1 do módulo "Reportes Mensais ANP": indicadores no topo + lista de
// empresas elegíveis (têm Monitoramento mensal E um ponto "1ª Barreira
// (ANP)" ativo — o backend já filtra isso, ver
// AnpMonthlyReportsService.listEligibleClients). CLIENT já recebe só as
// próprias empresas nessa mesma chamada (escopo aplicado no backend).
export default function ReportesAnpPage() {
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const router = useRouter();

  const { data: summary } = useQuery({
    queryKey: ['anp-monthly-reports', 'summary'],
    queryFn: anpMonthlyReportsApi.getSummary,
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['anp-monthly-reports', 'eligible-clients'],
    queryFn: anpMonthlyReportsApi.listEligibleClients,
  });

  // Cliente com 1 empresa só: pula direto pro nível 2 — não há nada a
  // escolher (mesmo padrão de Manutenção da Planta/Histórico).
  useEffect(() => {
    if (isClient && clients && clients.length === 1) {
      router.replace(`/reportes-anp/${clients[0].clientId}`);
    }
  }, [isClient, clients, router]);

  return (
    <div>
      <div className="page-header">
        <h1>Reportes Mensais ANP</h1>
        {!isClient && (
          <Link href="/reportes-anp/limites" className="btn btn-secondary">
            Limites Regulatórios
          </Link>
        )}
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Empresas monitoradas" value={summary.totalEligibleClients} />
          <StatCard label="Reportes gerados no mês" value={summary.reportsGeneratedThisMonth} />
          <StatCard label="Reportes pendentes" value={summary.pendingThisMonth} />
          <StatCard label="Fora da especificação" value={summary.nonConformingThisMonth} />
          <StatCard
            label="Última atualização"
            value={
              summary.lastSystemUpdate
                ? new Date(summary.lastSystemUpdate).toLocaleDateString('pt-BR')
                : '-'
            }
          />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {clients?.map((client, index) => (
            <Link
              key={client.clientId}
              href={`/reportes-anp/${client.clientId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: 'inherit',
                padding: '14px 16px',
                borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{client.clientName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {client.anpPointCount} ponto{client.anpPointCount > 1 ? 's' : ''} ANP · último reporte:{' '}
                  {client.lastReportGeneratedAt
                    ? new Date(client.lastReportGeneratedAt).toLocaleDateString('pt-BR')
                    : 'nunca gerado'}
                </div>
              </div>
              {(() => {
                const badge = client.hasPendingReports
                  ? ELIGIBLE_CLIENT_BADGE.pending
                  : ELIGIBLE_CLIENT_BADGE.upToDate;
                return (
                  <span className="badge" style={{ background: badge.background, color: badge.text }}>
                    {badge.label}
                  </span>
                );
              })()}
            </Link>
          ))}
          {clients?.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              Nenhuma empresa elegível ainda — precisa ter o serviço &quot;Monitoramento mensal&quot; e um
              ponto de amostragem do tipo &quot;1ª Barreira (ANP)&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
