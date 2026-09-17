'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { clientsApi } from '../../../lib/api/clients.api';
import { useCurrentUser } from '../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../lib/auth/ActiveClientContext';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Nível 1: lista de empresas (mesmo padrão de Manutenção da Planta/
// Histórico) — cada uma leva pra própria pasta de documentos
// ([clientId]/page.tsx). CLIENT com 1 empresa só pula direto pro nível 2; com
// 2+ usa o seletor "Empresa" do topo do portal, então também é redirecionado
// — a lista abaixo é só pra ADMIN/MANAGER navegarem entre clientes.
export default function DocumentosCompartilhadosPage() {
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const { activeClientId, isLoading: isLoadingActiveClient } = useActiveClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isClient && activeClientId) {
      router.replace(`/documentos-compartilhados/${activeClientId}`);
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

  const visibleClients = clients
    ?.filter((c) => c.status === 'ACTIVE')
    .filter((c) => c.companyName.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <h1>Documentos Compartilhados</h1>
      </div>

      <input
        className="input"
        style={{ maxWidth: 320, marginBottom: 16 }}
        placeholder="Pesquisar empresa..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {visibleClients?.map((client, index) => (
            <Link
              key={client.id}
              href={`/documentos-compartilhados/${client.id}`}
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
          {visibleClients?.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              {searchTerm ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
