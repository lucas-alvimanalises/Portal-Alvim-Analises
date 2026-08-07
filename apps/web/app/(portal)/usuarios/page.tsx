'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Role, ROLE_LABELS_PT } from '@portal-alvim/shared';
import { usersApi } from '../../../lib/api/users.api';
import { clientsApi } from '../../../lib/api/clients.api';
import { TableSkeleton } from '../../../components/shared/Skeleton';

export default function UsuariosPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Filtro reverso: em vez de abrir cada usuário CLIENT pra ver quais
  // empresas ele acessa, escolhe a empresa aqui e a lista já mostra só
  // quem tem acesso a ela (pedido do usuário: "identificar facilmente
  // quais usuários têm acesso a cada empresa cliente").
  const [companyFilter, setCompanyFilter] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });
  const queryClient = useQueryClient();

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPendingDeleteId(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.update(id, { active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.companyName]));
  const sortedClients = [...(clients ?? [])].sort((a, b) => a.companyName.localeCompare(b.companyName));

  const visibleUsers = data
    ?.filter((user) => showInactive || user.active)
    .filter((user) => {
      const term = searchTerm.trim().toLowerCase();
      return !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    })
    .filter((user) => !companyFilter || user.clientIds.includes(companyFilter));

  const hasActiveFilters = !!searchTerm || !!companyFilter;

  return (
    <div>
      <div className="page-header">
        <h1>Usuários</h1>
        <Link href="/usuarios/novo" className="btn btn-primary">
          Novo usuário
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          className="input"
          style={{ minWidth: 240 }}
          placeholder="Pesquisar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="input"
          style={{ minWidth: 220 }}
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">Acesso a qualquer empresa</option>
          {sortedClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 13 }}
            onClick={() => {
              setSearchTerm('');
              setCompanyFilter('');
            }}
          >
            Limpar filtros
          </button>
        )}
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
        Mostrar usuários inativos
      </label>

      <div className="card">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Empresas</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleUsers?.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{ROLE_LABELS_PT[user.role]}</td>
                  <td>
                    {user.role === Role.CLIENT
                      ? user.clientIds.length > 0
                        ? user.clientIds.map((id) => clientNameById.get(id) ?? '?').join(', ')
                        : '-'
                      : '-'}
                  </td>
                  <td>
                    <span className="badge">{user.active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Link href={`/usuarios/${user.id}`}>Editar</Link>

                      {user.active && pendingDeleteId !== user.id && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '2px 10px', fontSize: 13 }}
                          onClick={() => setPendingDeleteId(user.id)}
                        >
                          Excluir
                        </button>
                      )}

                      {pendingDeleteId === user.id && (
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 13 }}>Confirmar exclusão?</span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => deactivateMutation.mutate(user.id)}
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

                      {!user.active && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 10px', fontSize: 13 }}
                          onClick={() => reactivateMutation.mutate(user.id)}
                          disabled={reactivateMutation.isPending}
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleUsers?.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {data && data.length > 0 ? 'Nenhum usuário encontrado para os filtros aplicados.' : 'Nenhum usuário cadastrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
