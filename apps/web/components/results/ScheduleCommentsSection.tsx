'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Role } from '@portal-alvim/shared';
import { schedulesApi } from '../../lib/api/schedules.api';
import { useCurrentUser } from '../../lib/auth/useCurrentUser';

interface ScheduleCommentsSectionProps {
  scheduleId: string;
  internalComments: string | null;
  clientComments: string | null;
  clientResponse: string | null;
  trackingCode: string | null;
}

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

const STAFF_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN];

// Dois campos que a equipe Alvim escreve (comentário interno de campo e o
// comentário voltado ao cliente) + um campo que só o cliente escreve (a
// resposta dele) — cada lado só edita o próprio, e sempre enxerga o que o
// outro escreveu (exceto o comentário interno, que o cliente nunca vê — ver
// schedule.mapper.ts).
export function ScheduleCommentsSection({
  scheduleId,
  internalComments,
  clientComments,
  clientResponse,
  trackingCode,
}: ScheduleCommentsSectionProps) {
  const queryClient = useQueryClient();
  const [internalValue, setInternalValue] = useState(internalComments ?? '');
  const [clientValue, setClientValue] = useState(clientComments ?? '');
  const [responseValue, setResponseValue] = useState(clientResponse ?? '');
  const [trackingValue, setTrackingValue] = useState(trackingCode ?? '');

  const { data: me } = useCurrentUser();
  const isStaff = !!me && STAFF_ROLES.includes(me.role);
  const isClient = me?.role === Role.CLIENT;

  const saveMutation = useMutation({
    mutationFn: (payload: {
      internalComments?: string;
      clientComments?: string;
      clientResponse?: string;
      trackingCode?: string;
    }) => schedulesApi.updateComments(scheduleId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules', scheduleId] }),
  });

  if (!me) return null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isStaff && (
        <div className="field">
          <label>Comentários de coleta Alvim Análises</label>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0 }}>
            Anotações do técnico sobre a coleta (uso interno — o cliente não visualiza este campo).
          </p>
          <textarea
            className="input"
            rows={3}
            value={internalValue}
            onChange={(e) => setInternalValue(e.target.value)}
            onBlur={() => saveMutation.mutate({ internalComments: internalValue })}
          />
        </div>
      )}

      {(isStaff || trackingCode) && (
        <div className="field">
          <label>Código de rastreio (Correios)</label>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 0 }}>
            Do envio das amostras pro laboratório parceiro.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isStaff ? (
              <input
                className="input"
                style={{ maxWidth: 280 }}
                placeholder="Ex.: AA123456785BR"
                value={trackingValue}
                onChange={(e) => setTrackingValue(e.target.value)}
                onBlur={() => saveMutation.mutate({ trackingCode: trackingValue })}
              />
            ) : (
              <p style={{ margin: 0 }}>{trackingCode}</p>
            )}
            {(isStaff ? trackingValue : trackingCode) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => trackViaCorreios((isStaff ? trackingValue : trackingCode) || '')}
                title="Copia o código e abre o rastreamento dos Correios (peça pra colar o código lá — o site deles exige isso a cada consulta)"
              >
                Rastrear nos Correios
              </button>
            )}
          </div>
        </div>
      )}

      <div className="field">
        <label>Comentários Alvim Análises</label>
        {isStaff ? (
          <textarea
            className="input"
            rows={3}
            value={clientValue}
            onChange={(e) => setClientValue(e.target.value)}
            onBlur={() => saveMutation.mutate({ clientComments: clientValue })}
          />
        ) : (
          <p style={{ margin: 0 }}>{clientComments || 'Nenhum comentário registrado ainda.'}</p>
        )}
      </div>

      <div className="field">
        <label>{isClient ? 'Sua resposta' : 'Resposta do cliente'}</label>
        {isClient ? (
          <textarea
            className="input"
            rows={3}
            value={responseValue}
            onChange={(e) => setResponseValue(e.target.value)}
            onBlur={() => saveMutation.mutate({ clientResponse: responseValue })}
          />
        ) : (
          <p style={{ margin: 0 }}>{clientResponse || 'Nenhuma resposta do cliente ainda.'}</p>
        )}
      </div>
    </div>
  );
}
