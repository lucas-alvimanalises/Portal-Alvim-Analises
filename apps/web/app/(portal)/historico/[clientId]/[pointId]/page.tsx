'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { clientsApi } from '../../../../../lib/api/clients.api';
import { samplingPointsApi } from '../../../../../lib/api/sampling-points.api';
import { useCurrentUser } from '../../../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../../../lib/auth/ActiveClientContext';
import { HistoricoPontoContent } from '../../../../../components/historico/HistoricoPontoContent';
import { PeriodFilter } from '../../../../../components/historico/PeriodFilter';

export default function HistoricoPontoPage() {
  const params = useParams<{ clientId: string; pointId: string }>();
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const { activeClientId } = useActiveClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Mesma correção do nível 2: sem isso, trocar de empresa no seletor do
  // topo enquanto já está dentro do Histórico de um ponto de outra empresa
  // não tinha efeito nenhum (o clientId/pointId vêm da URL). O pointId
  // antigo não existe pra empresa nova, então volta pro nível 2 dela.
  useEffect(() => {
    if (me?.role === Role.CLIENT && activeClientId && activeClientId !== params.clientId) {
      router.replace(`/historico/${activeClientId}`);
    }
  }, [me?.role, activeClientId, params.clientId, router]);

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: samplingPoints } = useQuery({
    queryKey: ['sampling-points', params.clientId],
    queryFn: () => samplingPointsApi.listByClient(params.clientId),
  });
  const point = samplingPoints?.find((p) => p.id === params.pointId);

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/historico" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Histórico
          </Link>{' '}
          /{' '}
          <Link
            href={`/historico/${params.clientId}`}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            {client?.companyName ?? '...'}
          </Link>{' '}
          / {point?.name ?? '...'}
        </h1>
      </div>

      <PeriodFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <HistoricoPontoContent
        clientId={params.clientId}
        pointId={params.pointId}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
