'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { clientsApi } from '../../../../lib/api/clients.api';
import { samplingPointsApi } from '../../../../lib/api/sampling-points.api';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../../lib/auth/ActiveClientContext';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

// Nível 2 do Histórico: pontos de amostragem cadastrados pra esta empresa —
// cada um leva pro nível 3 (compostos + histórico de amostras).
export default function HistoricoEmpresaPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const { activeClientId } = useActiveClient();

  // Cliente troca de empresa no seletor do topo enquanto já está dentro do
  // Histórico de outra empresa — sem isso, a página ficava presa na empresa
  // antiga (o clientId vem da URL, não do seletor). Só se aplica a CLIENT:
  // Admin/Gestor navegam entre empresas livremente pela própria lista do
  // nível 1, não têm "empresa ativa" (confirmado com o usuário).
  useEffect(() => {
    if (me?.role === Role.CLIENT && activeClientId && activeClientId !== params.clientId) {
      router.replace(`/historico/${activeClientId}`);
    }
  }, [me?.role, activeClientId, params.clientId, router]);

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: samplingPoints, isLoading } = useQuery({
    queryKey: ['sampling-points', params.clientId],
    queryFn: () => samplingPointsApi.listByClient(params.clientId),
  });

  const activePoints = (samplingPoints ?? []).filter((p) => p.active);

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/historico" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Histórico
          </Link>{' '}
          / {client?.companyName ?? '...'}
        </h1>
        <Link href={`/historico/${params.clientId}/comparar`} className="btn btn-secondary">
          Comparar pontos
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {activePoints.map((point, index) => (
            <Link
              key={point.id}
              href={`/historico/${params.clientId}/${point.id}`}
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
              <span style={{ fontWeight: 600, fontSize: 14 }}>{point.name}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>▸</span>
            </Link>
          ))}
          {activePoints.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              Nenhum ponto de amostragem cadastrado para esta empresa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
