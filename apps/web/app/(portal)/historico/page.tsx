'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { clientsApi } from '../../../lib/api/clients.api';
import { useCurrentUser } from '../../../lib/auth/useCurrentUser';
import { useActiveClient } from '../../../lib/auth/ActiveClientContext';
import { CompanyHistorySection } from '../../../components/historico/CompanyHistorySection';
import { PeriodFilter } from '../../../components/historico/PeriodFilter';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Histórico de amostras/análises já realizadas, navegado por empresa >
// ponto de amostragem > composto (ver [clientId]/page.tsx e
// [clientId]/[pointId]/page.tsx) — mesmo padrão de "pastas" já usado em
// Cadeia de Custódia (apps/web/app/(portal)/amostras/page.tsx), só que a
// primeira pasta aqui é a empresa em vez do composto.
//
// Cliente com 1 empresa só: pula direto pro nível 2 dessa empresa — a lista
// de TODAS as empresas abaixo é só pra Admin/Gestor navegarem entre
// clientes, e um seletor aqui seria redundante já que só existe 1 opção.
//
// Cliente com 2+ empresas: em vez de escolher uma só (o seletor "Empresa" do
// topo continua existindo pro resto do portal), o Histórico mostra um
// seletor próprio de múltipla escolha — pode marcar 2 ou mais empresas e ver
// os pontos de amostragem de cada uma empilhados na mesma tela, cada ponto
// abrindo de forma independente (ver CompanyHistorySection), pra comparar
// lado a lado (ex.: Siloxanos da 1ª Barreira de julho em duas empresas)
// sem nunca misturar os dados de fato — cada seção busca e mostra só os
// próprios dados (confirmado com o usuário).
export default function HistoricoPage() {
  const { data: me } = useCurrentUser();
  const isClient = me?.role === Role.CLIENT;
  const { companies, activeClientId } = useActiveClient();
  const router = useRouter();
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Assim que a empresa ativa é conhecida, pré-marca só ela — ponto de
  // partida familiar (mesma empresa que já aparecia antes desta tela ganhar
  // o seletor de comparação), sem impedir marcar mais depois.
  useEffect(() => {
    if (isClient && activeClientId) {
      setSelectedClientIds((current) => (current.size === 0 ? new Set([activeClientId]) : current));
    }
  }, [isClient, activeClientId]);

  useEffect(() => {
    if (isClient && activeClientId && companies.length <= 1) {
      router.replace(`/historico/${activeClientId}`);
    }
  }, [isClient, activeClientId, companies.length, router]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.list,
    enabled: me !== undefined && !isClient,
  });

  function toggleCompany(clientId: string) {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  if (isClient) {
    if (companies.length <= 1) {
      return <TableSkeleton />;
    }

    return (
      <div>
        <div className="page-header">
          <h1>Histórico</h1>
          <Link href="/historico/comparar-empresas" className="btn btn-secondary">
            Comparar empresas
          </Link>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Selecione uma ou mais empresas pra visualizar (e comparar) o histórico:
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {companies.map((company) => (
              <label
                key={company.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
              >
                <input
                  type="checkbox"
                  checked={selectedClientIds.has(company.id)}
                  onChange={() => toggleCompany(company.id)}
                />
                {company.companyName}
              </label>
            ))}
          </div>
        </div>

        <PeriodFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {companies
            .filter((company) => selectedClientIds.has(company.id))
            .map((company) => (
              <CompanyHistorySection
                key={company.id}
                clientId={company.id}
                companyName={company.companyName}
                startDate={startDate}
                endDate={endDate}
              />
            ))}
          {selectedClientIds.size === 0 && (
            <div className="card">
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Selecione ao menos uma empresa acima.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Histórico</h1>
        <Link href="/historico/comparar-empresas" className="btn btn-secondary">
          Comparar empresas
        </Link>
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
                href={`/historico/${client.id}`}
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
