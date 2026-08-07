'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TableSkeleton } from '../../../../components/shared/Skeleton';
import {
  ANP_MONTH_STATUS_COLORS,
  ANP_MONTH_STATUS_ICONS,
  ANP_MONTH_STATUS_LABELS_PT,
} from '@portal-alvim/shared';
import { anpMonthlyReportsApi } from '../../../../lib/api/anp-monthly-reports.api';
import { clientsApi } from '../../../../lib/api/clients.api';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Nível 2: grade de anos/meses disponíveis pra essa empresa (do primeiro
// serviço de Monitoramento mensal até o mês atual) — cada mês já com o
// status ✅/⏳/❌ calculado pelo backend.
export default function ReportesAnpEmpresaPage() {
  const params = useParams<{ clientId: string }>();

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: months, isLoading } = useQuery({
    queryKey: ['anp-monthly-reports', 'months', params.clientId],
    queryFn: () => anpMonthlyReportsApi.listMonths(params.clientId),
  });

  const byYear = new Map<number, typeof months>();
  (months ?? [])
    .slice()
    .sort((a, b) => a.month - b.month)
    .forEach((m) => {
      const list = byYear.get(m.year) ?? [];
      list.push(m);
      byYear.set(m.year, list);
    });
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/reportes-anp" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Reportes Mensais ANP
          </Link>{' '}
          / {client?.companyName ?? '...'}
        </h1>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : years.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Nenhum serviço de Monitoramento mensal encontrado ainda para esta empresa.
          </p>
        </div>
      ) : (
        years.map((year) => (
          <div key={year} className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{year}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {byYear.get(year)!.map((m) => (
                <Link
                  key={`${m.year}-${m.month}`}
                  href={`/reportes-anp/${params.clientId}/${m.year}/${m.month}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{MONTH_NAMES_PT[m.month - 1]}</span>
                  <span
                    className="badge"
                    style={{
                      alignSelf: 'flex-start',
                      background: ANP_MONTH_STATUS_COLORS[m.status].background,
                      color: ANP_MONTH_STATUS_COLORS[m.status].text,
                    }}
                  >
                    {ANP_MONTH_STATUS_ICONS[m.status]} {ANP_MONTH_STATUS_LABELS_PT[m.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
