'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '../../../lib/api/clients.api';
import { localTipsApi } from '../../../lib/api/local-tips.api';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Nível 1 do módulo "Dicas Locais" (mesmo padrão de Manutenção da
// Planta/Reportes ANP): lista de empresas, cada uma leva pro nível 2
// ([clientId]/page.tsx) com as dicas cadastradas pra ela. Sem nenhuma
// versão pro papel CLIENT — o item de menu já não aparece pra ele.
export default function DicasLocaisPage() {
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.list,
  });
  const { data: counts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['local-tips-counts'],
    queryFn: localTipsApi.counts,
  });

  const isLoading = isLoadingClients || isLoadingCounts;
  const activeClients = clients?.filter((c) => c.status === 'ACTIVE') ?? [];

  return (
    <div>
      <div className="page-header">
        <h1>Dicas Locais</h1>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: -8, marginBottom: 16, fontSize: 13 }}>
        Lugares úteis perto de cada cliente — onde comer, onde comprar insumo que só acha na
        região, etc. Cadastrado pela equipe pra ajudar quem for pra lá pela primeira vez.
      </p>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {activeClients.map((client, index) => (
            <Link
              key={client.id}
              href={`/dicas-locais/${client.id}`}
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
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {client.companyName}
                {[client.city, client.state].filter(Boolean).length > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>
                    {' — '}
                    {[client.city, client.state].filter(Boolean).join('/')}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {counts?.[client.id] ?? 0} {counts?.[client.id] === 1 ? 'dica' : 'dicas'} ▸
              </span>
            </Link>
          ))}
          {activeClients.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>Nenhuma empresa cadastrada.</p>
          )}
        </div>
      )}
    </div>
  );
}
