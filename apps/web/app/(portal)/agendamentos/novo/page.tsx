'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateSchedulePayload } from '@portal-alvim/shared';
import { ScheduleForm } from '../../../../components/forms/ScheduleForm';
import { schedulesApi } from '../../../../lib/api/schedules.api';

export default function NovoAgendamentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // Cadastro em lote (um mês por agendamento) manda vários payloads de uma
    // vez — cria em sequência pra não sobrecarregar o backend e só redireciona
    // depois que todos terminarem.
    mutationFn: async (payloads: CreateSchedulePayload[]) => {
      for (const payload of payloads) {
        await schedulesApi.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      router.push('/agendamentos');
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Novo agendamento</h1>
      </div>
      <ScheduleForm
        submitLabel="Criar agendamento"
        onSubmit={(payloads) => mutation.mutateAsync(payloads)}
      />
    </div>
  );
}
