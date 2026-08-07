'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientStatus } from '@portal-alvim/shared';
import { clientsApi } from '../../../lib/api/clients.api';
import { TableSkeleton } from '../../../components/shared/Skeleton';

export default function EmpresasPage() {
  const [showInactive, setShowInactive] = useState(false);
  // Confirmação inline em vez de window.confirm(): mais confiável em
  // webviews/navegadores que bloqueiam diálogos nativos, e mais fácil de estilizar.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const queryClient = useQueryClient();

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => clientsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setPendingDeleteId(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => clientsApi.update(id, { status: ClientStatus.ACTIVE }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const visibleClients = data?.filter((client) => showInactive || client.status === 'ACTIVE');

  return (
    <div>
      <div className="page-header">
        <h1>Empresas</h1>
        <Link href="/empresas/novo" className="btn btn-primary">
          Nova empresa
        </Link>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        Mostrar empresas inativas
      </label>

      <div className="card">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Razão social</th>
                <th>CNPJ</th>
                <th>Cidade/UF</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleClients?.map((client) => (
                <tr key={client.id}>
                  <td>{client.companyName}</td>
                  <td>{client.cnpj}</td>
                  <td>
                    {client.city ?? '-'}/{client.state ?? '-'}
                    {client.mapsUrl && (
                      <>
                        {' · '}
                        <a href={client.mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          Maps ↗
                        </a>
                      </>
                    )}
                  </td>
                  <td>
                    <span className="badge">
                      {client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Link href={`/empresas/${client.id}`}>Editar</Link>

                      {client.status === 'ACTIVE' && pendingDeleteId !== client.id && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '2px 10px', fontSize: 13 }}
                          onClick={() => setPendingDeleteId(client.id)}
                        >
                          Excluir
                        </button>
                      )}

                      {pendingDeleteId === client.id && (
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13 }}>Confirmar exclusão?</span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => deactivateMutation.mutate(client.id)}
                            disabled={deactivateMutation.isPending}
                          >
                            {deactivateMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancelar
                          </button>
                        </span>
                      )}

                      {client.status !== 'ACTIVE' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 10px', fontSize: 13 }}
                          onClick={() => reactivateMutation.mutate(client.id)}
                          disabled={reactivateMutation.isPending}
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleClients?.length === 0 && (
                <tr>
                  <td colSpan={5}>Nenhuma empresa cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
