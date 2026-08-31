'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isFieldEligibleStaff, ScheduleDto } from '@portal-alvim/shared';
import { usersApi } from '../../lib/api/users.api';
import { schedulesApi } from '../../lib/api/schedules.api';
import { MultiSelect } from '../forms/MultiSelect';

interface ConfirmDropModalProps {
  schedule: ScheduleDto;
  // 'AAAA-MM-DD' do dia de destino do drop (ver CalendarGrid/onDragEnd).
  targetDayKey: string;
  onClose: () => void;
}

// Uma modal só pra todo drop (veio do painel "a agendar" ou reagendamento
// de um dia pra outro, com ou sem técnico já definido) — sempre mostra a
// data de destino e o seletor de técnicos (pré-preenchido com os atuais),
// sempre exige pelo menos 1 pra confirmar (mesma regra do formulário/
// backend, @ArrayMinSize(1)). Um código só em vez de dois fluxos
// condicionais (confirmado com o usuário).
export function ConfirmDropModal({ schedule, targetDayKey, onClose }: ConfirmDropModalProps) {
  const queryClient = useQueryClient();
  const [technicianIds, setTechnicianIds] = useState<string[]>(
    schedule.technicians.map((t) => t.id),
  );

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  // Gestor e Admin também podem ser designados responsáveis de campo, além
  // de Técnico — contas genéricas/desativadas ficam de fora (ver
  // isFieldEligibleStaff).
  const technicianOptions = (users ?? [])
    .filter(isFieldEligibleStaff)
    .map((u) => ({ value: u.id, label: u.name }));

  const mutation = useMutation({
    mutationFn: () =>
      schedulesApi.update(schedule.id, {
        scheduledDate: targetDayKey,
        dateConfirmed: true,
        technicianIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onClose();
    },
  });

  const originalScheduled = new Date(schedule.scheduledDate);
  const target = new Date(`${targetDayKey}T00:00:00Z`);
  // Só avisa divergência de mês pra quem ainda não tinha data confirmada —
  // um reagendamento de um dia já confirmado pra outro é sempre intencional,
  // não tem "mês previsto original" pra comparar.
  const monthMismatch =
    !schedule.dateConfirmed &&
    (originalScheduled.getUTCFullYear() !== target.getUTCFullYear() ||
      originalScheduled.getUTCMonth() !== target.getUTCMonth());

  const targetLabel = target.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const originalMonthLabel = originalScheduled.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div className="card" style={{ width: 420, maxWidth: '90vw' }}>
        <h3 style={{ marginTop: 0 }}>Confirmar agendamento</h3>
        <p style={{ fontSize: 14 }}>
          <strong>{schedule.clientName}</strong> — {schedule.serviceTypeName}
          <br />
          Nova data: <strong>{targetLabel}</strong>
        </p>

        {monthMismatch && (
          <p
            style={{
              fontSize: 13,
              color: '#854d0e',
              background: '#fef9c3',
              padding: 8,
              borderRadius: 6,
            }}
          >
            Este serviço estava previsto para {originalMonthLabel}. Deseja movê-lo mesmo assim?
          </p>
        )}

        <div className="field">
          <label>Técnicos responsáveis</label>
          <MultiSelect
            options={technicianOptions}
            value={technicianIds}
            onChange={setTechnicianIds}
            placeholder="Selecione os técnicos..."
            emptyMessage="Nenhum técnico cadastrado."
          />
          {technicianIds.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              Selecione ao menos um técnico.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={technicianIds.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
