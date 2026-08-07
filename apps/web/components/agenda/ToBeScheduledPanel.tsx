'use client';

import { ScheduleDto } from '@portal-alvim/shared';
import { ScheduleCard } from './ScheduleCard';
import { TechnicianColor } from '../../lib/agenda/technician-colors';

interface ToBeScheduledPanelProps {
  schedules: ScheduleDto[];
  technicianColors: Map<string, TechnicianColor>;
}

// Serviços do mês exibido que ainda só têm "mês previsto" (dateConfirmed
// false) — arrastáveis pro grid do calendário pra ganhar data exata (ver
// CalendarGrid.tsx e ConfirmDropModal.tsx).
export function ToBeScheduledPanel({ schedules, technicianColors }: ToBeScheduledPanelProps) {
  return (
    <div className="card">
      <h2 style={{ fontSize: 15, margin: '0 0 12px' }}>Serviços do mês a agendar</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            origin="panel"
            color={technicianColors.get(schedule.technicians[0]?.id ?? '')}
          />
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
