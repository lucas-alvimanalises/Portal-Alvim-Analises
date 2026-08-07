'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { samplingPointsApi } from '../../lib/api/sampling-points.api';
import { samplingPointStandardsApi } from '../../lib/api/sampling-point-standards.api';
import { TableSkeleton } from '../shared/Skeleton';

interface SamplingPointFormValues {
  name: string;
  standardId: string;
}

// Painel de "Pontos de Amostragem" da empresa: fechado por padrão (botão
// abre/fecha), lista os pontos já cadastrados e permite adicionar novos.
// O campo "Tipo padrão" é opcional — só existe para marcar pontos que,
// mesmo com nomes diferentes por empresa, representam o mesmo tipo de
// medição (ex.: "1ª Barreira (ANP)"), permitindo comparar entre clientes.
export function SamplingPointsManager({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: points, isLoading } = useQuery({
    queryKey: ['sampling-points', clientId],
    queryFn: () => samplingPointsApi.listByClient(clientId),
    enabled: open,
  });

  const { data: standards } = useQuery({
    queryKey: ['sampling-point-standards'],
    queryFn: samplingPointStandardsApi.list,
    enabled: open,
  });

  const { register, handleSubmit, reset } = useForm<SamplingPointFormValues>({
    defaultValues: { name: '', standardId: '' },
  });

  const createMutation = useMutation({
    mutationFn: (data: SamplingPointFormValues) =>
      samplingPointsApi.create({ clientId, name: data.name, standardId: data.standardId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampling-points', clientId] });
      reset();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => samplingPointsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampling-points', clientId] });
      setPendingRemoveId(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => samplingPointsApi.update(id, { active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sampling-points', clientId] }),
  });

  const visiblePoints = points?.filter((p) => showInactive || p.active);

  return (
    <div style={{ marginTop: 16, maxWidth: 560 }}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen((o) => !o)}>
        {open ? 'Fechar pontos de amostragem' : 'Cadastro de Pontos de Amostragem'}
      </button>

      {open && (
        <div className="card" style={{ marginTop: 12 }}>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  marginBottom: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Mostrar pontos removidos
              </label>

              <table>
                <thead>
                  <tr>
                    <th>Nome do ponto</th>
                    <th>Tipo padrão</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visiblePoints?.map((point) => (
                    <tr key={point.id}>
                      <td>{point.name}</td>
                      <td>{point.standardName ?? '-'}</td>
                      <td>
                        {!point.active ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => restoreMutation.mutate(point.id)}
                          >
                            Restaurar
                          </button>
                        ) : pendingRemoveId === point.id ? (
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 13 }}>Remover?</span>
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '2px 10px', fontSize: 13 }}
                              onClick={() => removeMutation.mutate(point.id)}
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '2px 10px', fontSize: 13 }}
                              onClick={() => setPendingRemoveId(null)}
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => setPendingRemoveId(point.id)}
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visiblePoints?.length === 0 && (
                    <tr>
                      <td colSpan={3}>Nenhum ponto de amostragem cadastrado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <form
                onSubmit={handleSubmit((data) => createMutation.mutate(data))}
                style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'flex-end' }}
              >
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label htmlFor="samplingPointName">Nome do ponto</label>
                  <input
                    id="samplingPointName"
                    className="input"
                    placeholder="Ex.: Barreira 1 - Entrada"
                    {...register('name', { required: true })}
                  />
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label htmlFor="samplingPointStandard">Tipo padrão (opcional)</label>
                  <select id="samplingPointStandard" className="input" {...register('standardId')}>
                    <option value="">Nenhum</option>
                    {standards?.map((standard) => (
                      <option key={standard.id} value={standard.id}>
                        {standard.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
