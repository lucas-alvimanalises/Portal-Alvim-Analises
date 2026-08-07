'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { clientsApi } from '../../../lib/api/clients.api';
import { useCurrentUser } from '../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../lib/auth/ActiveClientContext';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Nível 1 do módulo "Manutenção da Planta": lista de empresas (mesmo padrão
// de Histórico/Cadeia de Custódia) — cada uma leva pro nível 2
// ([clientId]/page.tsx) com o histórico de manutenções daquela empresa.
// CLIENT com 1 empresa só pula direto pro nível 2 (não há nada a escolher);
// com 2+ empresas usa o próprio seletor "Empresa" do topo do portal, então
// também é redirecionado — a lista abaixo é só pra Admin/Gestor navegarem
// entre clientes.
export default function ManutencaoPage() {
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const { activeClientId, isLoading: isLoadingActiveClient } = useActiveClient();
  const router = useRouter();

  useEffect(() => {
    if (isClient && activeClientId) {
      router.replace(`/manutencao/${activeClientId}`);
    }
  }, [isClient, activeClientId, router]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.list,
    enabled: me !== undefined && !isClient,
  });

  if (isClient) {
    return <p>{isLoadingActiveClient ? 'Carregando...' : 'Redirecionando...'}</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Manutenção da Planta</h1>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {clients
            ?.filter((c) => c.status === 'ACTIVE')
            .map((client, index) => (
              <Link
                key={client.id}
                href={`/manutencao/${client.id}`}
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
                <span style={{ fontWeight: 600, fontSize: 14 }}>{client.companyName}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>▸</span>
              </Link>
            ))}
          {clients?.filter((c) => c.status === 'ACTIVE').length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              Nenhuma empresa cadastrada.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
