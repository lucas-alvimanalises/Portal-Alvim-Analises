'use client';

import { ScheduleDto } from '@portal-alvim/shared';
import { ScheduleCard } from './ScheduleCard';

interface ToBeScheduledPanelProps {
  schedules: ScheduleDto[];
}

// Serviços do mês exibido que ainda só têm "mês previsto" (dateConfirmed
// false) — arrastáveis pro grid do calendário pra ganhar data exata (ver
// CalendarGrid.tsx e ConfirmDropModal.tsx). Sem cor por técnico aqui de
// propósito (fundo sempre branco/neutro, pedido do usuário): esses
// serviços ainda não têm data confirmada, então o técnico responsável
// também não precisa estar definido ainda — a cor por técnico só faz
// sentido pros cards já alocados num dia do grid.
export function ToBeScheduledPanel({ schedules }: ToBeScheduledPanelProps) {
  return (
    <div className="card">
      <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>Serviços do mês a agendar</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {schedules.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} origin="panel" />
        ))}
        {schedules.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
            Nenhum serviço deste mês aguardando data exata.
          </p>
        )}
      </div>
    </div>
  );
}
