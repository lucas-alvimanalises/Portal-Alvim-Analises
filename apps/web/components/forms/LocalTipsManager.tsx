'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateLocalTipPayload,
  LOCAL_TIP_CATEGORY_LABELS_PT,
  LocalTipCategory,
  LocalTipDto,
  Role,
} from '@portal-alvim/shared';
import { localTipsApi } from '../../lib/api/local-tips.api';
import { useCurrentUser } from '../../lib/auth/useCurrentUser';
import { TableSkeleton } from '../shared/Skeleton';

function emptyForm(clientId: string): CreateLocalTipPayload {
  return { clientId, name: '', category: LocalTipCategory.FOOD, address: '', mapsUrl: '', notes: '' };
}

// Painel de "Dicas Locais" da empresa — mesmo padrão de painel fechado por
// padrão do SamplingPointsManager logo acima. Lugares úteis perto do
// cliente (onde comer, onde comprar insumo que só acha na região, etc.),
// cadastrados livremente por qualquer colaborador que já passou por lá —
// movido de uma tela própria (/dicas-locais) pra dentro de Editar Empresa
// (pedido do usuário: não precisa de item de menu à parte).
export function LocalTipsManager({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLocalTipPayload>(emptyForm(clientId));
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const canModerate = me?.role === Role.ADMIN || me?.role === Role.MANAGER;

  const { data: tips, isLoading } = useQuery({
    queryKey: ['local-tips', clientId],
    queryFn: () => localTipsApi.listByClient(clientId),
    enabled: open,
  });

  function resetForm() {
    setForm(emptyForm(clientId));
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(tip: LocalTipDto) {
    setForm({
      clientId,
      name: tip.name,
      category: tip.category,
      address: tip.address ?? '',
      mapsUrl: tip.mapsUrl ?? '',
      notes: tip.notes ?? '',
    });
    setEditingId(tip.id);
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: () => localTipsApi.create(form),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['local-tips', clientId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => localTipsApi.update(editingId!, form),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['local-tips', clientId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => localTipsApi.remove(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['local-tips', clientId] });
    },
  });

  function canModify(tip: LocalTipDto): boolean {
    return canModerate || tip.createdById === me?.id;
  }

  return (
    <div style={{ marginTop: 16, maxWidth: 560 }}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen((o) => !o)}>
        {open ? 'Fechar dicas locais' : 'Dicas Locais'}
      </button>

      {open && (
        <div className="card" style={{ marginTop: 12 }}>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {tips?.map((tip, index) => (
                <div
                  key={tip.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <strong style={{ fontSize: 14 }}>{tip.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {LOCAL_TIP_CATEGORY_LABELS_PT[tip.category]}
                      </span>
                    </div>
                    {tip.address && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {tip.mapsUrl ? (
                          <a href={tip.mapsUrl} target="_blank" rel="noreferrer">
                            {tip.address}
                          </a>
                        ) : (
                          tip.address
                        )}
                      </div>
                    )}
                    {tip.notes && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{tip.notes}</div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Cadastrado por {tip.createdByName}
                    </div>
                  </div>

                  {canModify(tip) && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {pendingDeleteId === tip.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => deleteMutation.mutate(tip.id)}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => startEdit(tip)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '2px 10px', fontSize: 13 }}
                            onClick={() => setPendingDeleteId(tip.id)}
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {tips?.length === 0 && !showForm && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Nenhuma dica cadastrada pra essa empresa ainda.
                </p>
              )}

              {showForm ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingId) updateMutation.mutate();
                    else createMutation.mutate();
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}
                >
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div className="field" style={{ flex: 2, minWidth: 200, marginBottom: 0 }}>
                      <label htmlFor="tipName">Nome do lugar</label>
                      <input
                        id="tipName"
                        className="input"
                        required
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                      <label htmlFor="tipCategory">Categoria</label>
                      <select
                        id="tipCategory"
                        className="input"
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as LocalTipCategory }))}
                      >
                        {Object.values(LocalTipCategory).map((c) => (
                          <option key={c} value={c}>
                            {LOCAL_TIP_CATEGORY_LABELS_PT[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                      <label htmlFor="tipAddress">Endereço</label>
                      <input
                        id="tipAddress"
                        className="input"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                      <label htmlFor="tipMapsUrl">Link do Google Maps</label>
                      <input
                        id="tipMapsUrl"
                        className="input"
                        placeholder="https://maps.google.com/..."
                        value={form.mapsUrl}
                        onChange={(e) => setForm((f) => ({ ...f, mapsUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label htmlFor="tipNotes">Observação</label>
                    <input
                      id="tipNotes"
                      className="input"
                      placeholder='Ex.: "Fecha 22h, só dinheiro"'
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingId ? 'Salvar' : 'Adicionar'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                  onClick={() => setShowForm(true)}
                >
                  Nova Dica
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
