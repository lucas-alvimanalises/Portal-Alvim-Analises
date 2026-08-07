'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { isScheduleRealized } from '../../../../lib/schedule-date';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

function formatPeriodo(scheduledDate: string, dateConfirmed: boolean): string {
  if (dateConfirmed) {
    return new Date(scheduledDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  return new Date(scheduledDate).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

function ScheduleRow({ schedule }: { schedule: ScheduleDto }) {
  return (
    <Link
      href={`/agenda/organizar-servico/${schedule.id}`}
      className="card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{schedule.clientName}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {schedule.serviceTypeName}
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'right' }}>
        {formatPeriodo(schedule.scheduledDate, schedule.dateConfirmed)}
        <br />
        {schedule.technicians.map((t) => t.name).join(', ') || 'Sem técnico definido'}
      </div>
    </Link>
  );
}

// Ponto de entrada de "Organizar Serviço" pra quem chega pelo menu (Técnico,
// que não vê o Calendário) — a técnico já vê só os próprios serviços aqui
// (mesmo escopo por dono já aplicado em GET /schedules, ver scope.util.ts).
// ADMIN/Gestor normalmente chegam direto pelo card do Calendário, mas também
// podem usar esta lista.
export default function OrganizarServicoListPage() {
  const [showPrevious, setShowPrevious] = useState(false);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.list(),
  });

  const active = (schedules ?? []).filter((s) => s.status !== ScheduleStatus.CANCELLED);

  // Mesmo critério de "Agendamento" vs "Realizados" (ver isScheduleRealized)
  // — só o que ainda está por vir aparece na lista principal; o que já
  // passou fica recolhido em "Serviços Anteriores", sem sumir da tela.
  const upcoming = active
    .filter((s) => !isScheduleRealized(s))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const previous = active
    .filter((s) => isScheduleRealized(s))
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  return (
    <div>
      <div className="page-header">
        <h1>Organizar Serviço</h1>
      </div>
      <p style={{ color: 'var(--color-text-muted)', marginTop: -8 }}>
        Escolha um serviço agendado para imprimir cadeias de custódia, etiquetas ou preencher o
        checklist de campo.
      </p>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Nenhum serviço agendado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {upcoming.map((schedule) => (
                <ScheduleRow key={schedule.id} schedule={schedule} />
              ))}
            </div>
          )}

          {previous.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPrevious((open) => !open)}
              >
                Serviços Anteriores ({previous.length}) {showPrevious ? '▲' : '▼'}
              </button>
              {showPrevious && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {previous.map((schedule) => (
                    <ScheduleRow key={schedule.id} schedule={schedule} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
