'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateLocalTipPayload,
  LOCAL_TIP_CATEGORY_LABELS_PT,
  LocalTipCategory,
  LocalTipDto,
  Role,
} from '@portal-alvim/shared';
import { clientsApi } from '../../../../lib/api/clients.api';
import { localTipsApi } from '../../../../lib/api/local-tips.api';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

const CATEGORY_COLORS: Record<LocalTipCategory, { background: string; text: string }> = {
  [LocalTipCategory.FOOD]: { background: '#fef3c7', text: '#92400e' },
  [LocalTipCategory.SUPPLIES]: { background: '#e0f2fe', text: '#0369a1' },
  [LocalTipCategory.LODGING]: { background: '#ede9fe', text: '#5b21b6' },
  [LocalTipCategory.OTHER]: { background: '#f1f5f9', text: '#64748b' },
};

const EMPTY_FORM: CreateLocalTipPayload = {
  clientId: '',
  name: '',
  category: LocalTipCategory.FOOD,
  address: '',
  mapsUrl: '',
  notes: '',
};

// Nível 2: dicas locais desta empresa, com formulário de cadastro inline
// (recurso simples demais pra justificar uma tela /nova à parte, diferente
// de Manutenção da Planta) — mesmo padrão visual de lista com ações por
// linha do módulo de Manutenção.
export default function DicasLocaisEmpresaPage() {
  const params = useParams<{ clientId: string }>();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const canModerate = me?.role === Role.ADMIN || me?.role === Role.MANAGER;

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLocalTipPayload>({ ...EMPTY_FORM, clientId: params.clientId });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ['clients', params.clientId],
    queryFn: () => clientsApi.get(params.clientId),
  });

  const { data: tips, isLoading } = useQuery({
    queryKey: ['local-tips', params.clientId],
    queryFn: () => localTipsApi.listByClient(params.clientId),
  });

  function resetForm() {
    setForm({ ...EMPTY_FORM, clientId: params.clientId });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(tip: LocalTipDto) {
    setForm({
      clientId: params.clientId,
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
      queryClient.invalidateQueries({ queryKey: ['local-tips', params.clientId] });
      queryClient.invalidateQueries({ queryKey: ['local-tips-counts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => localTipsApi.update(editingId!, form),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['local-tips', params.clientId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => localTipsApi.remove(id),
    onSuccess: () => {
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['local-tips', params.clientId] });
      queryClient.invalidateQueries({ queryKey: ['local-tips-counts'] });
    },
  });

  function canModify(tip: LocalTipDto): boolean {
    return canModerate || tip.createdById === me?.id;
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Link href="/dicas-locais" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            Dicas Locais
          </Link>{' '}
          / {client?.companyName ?? '...'}
        </h1>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Nova Dica
          </button>
        )}
      </div>

      {showForm && (
        <form
          className="card"
          style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) updateMutation.mutate();
            else createMutation.mutate();
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 2, minWidth: 200 }}>
              <label htmlFor="name">Nome do lugar</label>
              <input
                id="name"
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
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
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="address">Endereço</label>
              <input
                id="address"
                className="input"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="mapsUrl">Link do Google Maps</label>
              <input
                id="mapsUrl"
                className="input"
                placeholder="https://maps.google.com/..."
                value={form.mapsUrl}
                onChange={(e) => setForm((f) => ({ ...f, mapsUrl: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">Observação</label>
            <textarea
              id="notes"
              className="input"
              rows={2}
              placeholder='Ex.: "Fecha 22h, só dinheiro" / "Único posto que vende gelo em escama"'
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
              {editingId ? 'Salvar' : 'Cadastrar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {tips?.map((tip, index) => (
            <div
              key={tip.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{tip.name}</span>
                  <span
                    className="badge"
                    style={{
                      background: CATEGORY_COLORS[tip.category].background,
                      color: CATEGORY_COLORS[tip.category].text,
                    }}
                  >
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
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {tip.notes}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
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
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => deleteMutation.mutate(tip.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
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
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => startEdit(tip)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '4px 10px', fontSize: 12 }}
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
          {tips?.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-text-muted)' }}>
              Nenhuma dica cadastrada pra essa empresa ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
