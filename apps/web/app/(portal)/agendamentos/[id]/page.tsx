'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateSchedulePayload, Role, ScheduleStatus } from '@portal-alvim/shared';
import { ScheduleForm } from '../../../../components/forms/ScheduleForm';
import { ApiError } from '../../../../lib/api/client';
import { clientsApi } from '../../../../lib/api/clients.api';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { generateServiceOrderPdf } from '../../../../lib/pdf/service-order';
import { useCurrentUser } from '../../../../lib/auth/useCurrentUser';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

export default function EditarAgendamentoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();

  // CLIENT não edita agendamento (confirmado com o usuário) — o link já não
  // aparece na listagem, isso aqui cobre quem tenta acessar direto pela URL.
  useEffect(() => {
    if (me?.role === Role.CLIENT) {
      router.replace('/agendamentos');
    }
  }, [me?.role, router]);

  const [pendingCancel, setPendingCancel] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pendingSend, setPendingSend] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['schedules', params.id],
    queryFn: () => schedulesApi.get(params.id),
  });

  const { data: companies } = useQuery({ queryKey: ['clients'], queryFn: clientsApi.list });

  const mutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) =>
      schedulesApi.update(params.id, {
        clientId: payload.clientId,
        serviceTypeId: payload.serviceTypeId,
        technicianIds: payload.technicianIds,
        scheduledDate: payload.scheduledDate,
        endDate: payload.endDate,
        dateConfirmed: payload.dateConfirmed,
        samplingPoints: payload.samplingPoints,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      router.push('/agendamentos');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => schedulesApi.updateStatus(params.id, { status: ScheduleStatus.CANCELLED }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setPendingCancel(false);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => schedulesApi.updateStatus(params.id, { status: ScheduleStatus.SCHEDULED }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

  const sendToClientMutation = useMutation({
    mutationFn: () => schedulesApi.sendToClient(params.id),
    onSuccess: (result) => {
      setPendingSend(false);
      setSendResult(`PDF enviado para: ${result.sentTo.join(', ')}`);
    },
    onError: (error) => {
      setPendingSend(false);
      setSendResult(error instanceof ApiError ? error.message : 'Não foi possível enviar o e-mail.');
    },
  });

  async function handleGeneratePdf() {
    if (!data) return;
    setIsGeneratingPdf(true);
    try {
      const client = companies?.find((c) => c.id === data.clientId);
      await generateServiceOrderPdf(data, client);
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível gerar o PDF da ordem de serviço.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Editar agendamento</h1>
        {data && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
            </button>

            {!pendingSend && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSendResult(null);
                  setPendingSend(true);
                }}
              >
                Enviar agendamento para cliente
              </button>
            )}

            {pendingSend && (
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>
                  Enviar o PDF por e-mail aos usuários desta empresa?
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => sendToClientMutation.mutate()}
                  disabled={sendToClientMutation.isPending}
                >
                  {sendToClientMutation.isPending ? 'Enviando...' : 'Sim, enviar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPendingSend(false)}
                  disabled={sendToClientMutation.isPending}
                >
                  Cancelar
                </button>
              </span>
            )}

            {data.status !== ScheduleStatus.CANCELLED && !pendingCancel && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setPendingCancel(true)}
              >
                Excluir
              </button>
            )}

            {pendingCancel && (
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>Confirmar exclusão?</span>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPendingCancel(false)}
                >
                  Cancelar
                </button>
              </span>
            )}

            {data.status === ScheduleStatus.CANCELLED && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
              >
                Reativar
              </button>
            )}
          </div>
        )}
      </div>

      {sendResult && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: -12 }}>
          {sendResult}
        </p>
      )}

      {isLoading || !data ? (
        <TableSkeleton />
      ) : (
        <ScheduleForm
          defaultValues={data}
          submitLabel="Salvar alterações"
          onSubmit={(payloads) => mutation.mutateAsync(payloads[0])}
        />
      )}
    </div>
  );
}
