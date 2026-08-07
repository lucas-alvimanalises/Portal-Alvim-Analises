'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ContractDto } from '@portal-alvim/shared';
import { contractsApi } from '../../../lib/api/contracts.api';
import { useActiveClient } from '../../../lib/auth/ActiveClientContext';
import { TableSkeleton } from '../../../components/shared/Skeleton';

type SortDirection = 'asc' | 'desc';

export default function ContratosPage() {
  const { activeClientId } = useActiveClient();
  const { data, isLoading } = useQuery({
    queryKey: ['contracts', activeClientId],
    queryFn: () => contractsApi.list(activeClientId ?? undefined),
  });

  // Ordenação por Cliente — a lista não tem escopo de empresa pra
  // ADMIN/MANAGER (activeClientId só existe pro papel CLIENT, ver
  // ActiveClientContext), então sem essa coluna não dava pra saber de quem
  // era cada contrato nem checar rapidamente "todo cliente ativo tem
  // contrato vigente" (ver especificação de Dashboard e telas de apoio).
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

  function toggleSort() {
    setSortDirection((current) => (current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc'));
  }

  const sortedContracts = (() => {
    if (!data || !sortDirection) return data;
    const sorted = [...data].sort((a, b) =>
      a.client.companyName.localeCompare(b.client.companyName, 'pt-BR'),
    );
    return sortDirection === 'asc' ? sorted : sorted.reverse();
  })();

  return (
    <div>
      <div className="page-header">
        <h1>Contratos</h1>
        <Link href="/contratos/novo" className="btn btn-primary">
          Novo contrato
        </Link>
      </div>

      <div className="card">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th
                  onClick={toggleSort}
                  style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  title="Ordenar por Cliente"
                >
                  Cliente{' '}
                  <span style={{ fontSize: 10, color: sortDirection ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {sortDirection === 'desc' ? '▲' : '▼'}
                  </span>
                </th>
                <th>Início</th>
                <th>Periodicidade</th>
                <th>Escopo</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedContracts?.map((contract: ContractDto) => (
                <tr key={contract.id}>
                  <td>{contract.name}</td>
                  <td>{contract.client.companyName}</td>
                  <td>{new Date(contract.startDate).toLocaleDateString('pt-BR')}</td>
                  <td>{contract.periodicity ?? '-'}</td>
                  <td>{contract.scopes.map((s) => s.serviceType.name).join(', ') || '-'}</td>
                  <td>
                    <span className="badge">{contract.active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td>
                    <Link href={`/contratos/${contract.id}`}>Editar</Link>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhum contrato cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
