'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Role,
  TRACKING_SHIPMENT_STATUS_COLORS,
  TRACKING_SHIPMENT_STATUS_LABELS_PT,
  TrackingShipmentStatus,
} from '@portal-alvim/shared';
import { trackingShipmentsApi } from '../../../lib/api/tracking-shipments.api';
import { useCurrentUser } from '../../../lib/auth/useCurrentUser';
import { ApiError } from '../../../lib/api/client';
import { TableSkeleton } from '../../../components/shared/Skeleton';

// Site oficial dos Correios exige captcha em toda consulta — não existe link
// que já chegue com o resultado pronto (confirmado navegando lá: um
// ?objetos=... na URL é descartado e volta pro formulário em branco). Copiar
// o código pro clipboard antes de abrir a página poupa o usuário de digitar/
// colar na mão, mesmo não eliminando o captcha.
async function trackViaCorreios(code: string) {
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Sem permissão de clipboard (raro) — segue mesmo assim, só sem copiar.
  }
  window.open('https://rastreamento.correios.com.br/app/index.php', '_blank', 'noopener,noreferrer');
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

// Submenu "Serviços > Código de Rastreio": log de envios de amostras pelos
// Correios pro laboratório parceiro. Entidade própria (não presa a um
// agendamento) — um envio pode levar amostras de mais de um serviço.
export default function CodigoRastreioPage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === Role.ADMIN;

  const [showForm, setShowForm] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [description, setDescription] = useState('');

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['tracking-shipments'],
    queryFn: trackingShipmentsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: trackingShipmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-shipments'] });
      setTrackingCode('');
      setDescription('');
      setShowForm(false);
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (id: string) => trackingShipmentsApi.markDelivered(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracking-shipments'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => trackingShipmentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracking-shipments'] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Código de Rastreio</h1>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : 'Cadastrar Código de Rastreio'}
        </button>
      </div>

      {showForm && (
        <form
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!trackingCode.trim() || !description.trim()) return;
            createMutation.mutate({ trackingCode: trackingCode.trim(), description: description.trim() });
          }}
        >
          <div className="field">
            <label>Código de rastreio</label>
            <input
              className="input"
              placeholder="Ex.: AA123456785BR"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Descrição do que está sendo enviado</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Ex.: Amostras de Siloxanos e VOCs — Cliente X, coleta 20/08"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          {createMutation.isError && (
            <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
              {createMutation.error instanceof ApiError
                ? createMutation.error.message
                : 'Não foi possível cadastrar o código de rastreio.'}
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : !shipments || shipments.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Nenhum código de rastreio cadastrado ainda.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shipments.map((shipment) => (
            <div key={shipment.id} className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 15 }}>{shipment.trackingCode}</strong>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: TRACKING_SHIPMENT_STATUS_COLORS[shipment.status].text,
                        background: TRACKING_SHIPMENT_STATUS_COLORS[shipment.status].background,
                        borderRadius: 999,
                        padding: '2px 10px',
                      }}
                    >
                      {TRACKING_SHIPMENT_STATUS_LABELS_PT[shipment.status]}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 14 }}>{shipment.description}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Postado em {formatDateTime(shipment.postedAt)}
                    {shipment.createdBy && ` por ${shipment.createdBy.name}`}
                    {shipment.status === TrackingShipmentStatus.DELIVERED &&
                      shipment.deliveredAt &&
                      ` · Entregue em ${formatDateTime(shipment.deliveredAt)}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => trackViaCorreios(shipment.trackingCode)}
                    title="Copia o código e abre o rastreamento dos Correios (peça pra colar o código lá — o site deles exige isso a cada consulta)"
                  >
                    Rastrear nos Correios
                  </button>
                  {shipment.status === TrackingShipmentStatus.IN_TRANSIT && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={deliverMutation.isPending}
                      onClick={() => deliverMutation.mutate(shipment.id)}
                    >
                      Marcar como entregue
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Excluir este código de rastreio?')) {
                          removeMutation.mutate(shipment.id);
                        }
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
