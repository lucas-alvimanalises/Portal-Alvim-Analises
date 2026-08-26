'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CalendarNoteDto, ScheduleDto } from '@portal-alvim/shared';
import { ScheduleCard } from './ScheduleCard';
import { TechnicianColor } from '../../lib/agenda/technician-colors';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_VISIBLE_PER_DAY = 2;

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface DayCellData {
  date: Date;
  isCurrentMonth: boolean;
  dayKey: string;
}

// Grade mensal completa (semanas inteiras) — meses anterior/seguinte
// aparecem esmaecidos só pra preencher a semana, mas continuam sendo alvo
// de drop válido (é exatamente o caso de "arrastar pra fora do mês
// previsto" que a modal de confirmação avisa).
function buildMonthGrid(year: number, month: number): DayCellData[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: DayCellData[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(year, month - 1, daysInPrevMonth - i));
    cells.push({ date, isCurrentMonth: false, dayKey: toDayKey(date) });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day));
    cells.push({ date, isCurrentMonth: true, dayKey: toDayKey(date) });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate() + 1));
    cells.push({ date: next, isCurrentMonth: false, dayKey: toDayKey(next) });
  }
  return cells;
}

function DayCell({
  cell,
  isToday,
  schedules,
  notes,
  technicianColors,
  onNoteClick,
}: {
  cell: DayCellData;
  isToday: boolean;
  schedules: ScheduleDto[];
  notes: CalendarNoteDto[];
  technicianColors: Map<string, TechnicianColor>;
  onNoteClick: (dayKey: string, note: CalendarNoteDto | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${cell.dayKey}` });
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? schedules : schedules.slice(0, MAX_VISIBLE_PER_DAY);
  const hiddenCount = schedules.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 110,
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: isOver ? 'var(--color-bg)' : 'var(--color-surface)',
        opacity: cell.isCurrentMonth ? 1 : 0.45,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: isToday ? 700 : 400,
          color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)',
        }}
      >
        {cell.date.getUTCDate()}
      </span>
      {visible.map((schedule) => (
        <ScheduleCard
          key={schedule.id}
          schedule={schedule}
          origin="day"
          dayKey={cell.dayKey}
          colors={schedule.technicians
            .map((t) => technicianColors.get(t.id))
            .filter((c): c is TechnicianColor => !!c)}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          +{hiddenCount} mais
        </button>
      )}
      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          onClick={() => onNoteClick(cell.dayKey, note)}
          title={note.text}
          style={{
            fontSize: 11,
            fontStyle: 'italic',
            color: note.technicianId ? technicianColors.get(note.technicianId)?.border : 'var(--color-text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {note.text}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onNoteClick(cell.dayKey, null)}
        style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          opacity: 0.7,
        }}
      >
        + nota
      </button>
    </div>
  );
}

interface CalendarGridProps {
  year: number;
  month: number;
  schedulesByDay: Map<string, ScheduleDto[]>;
  notesByDay: Map<string, CalendarNoteDto[]>;
  technicianColors: Map<string, TechnicianColor>;
  onNoteClick: (dayKey: string, note: CalendarNoteDto | null) => void;
}

export function CalendarGrid({
  year,
  month,
  schedulesByDay,
  notesByDay,
  technicianColors,
  onNoteClick,
}: CalendarGridProps) {
  const cells = buildMonthGrid(year, month);
  const now = new Date();
  const todayKey = toDayKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: 'var(--color-text-muted)' }}
          >
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((cell) => (
          <DayCell
            key={cell.dayKey}
            cell={cell}
            isToday={cell.dayKey === todayKey}
            schedules={schedulesByDay.get(cell.dayKey) ?? []}
            notes={notesByDay.get(cell.dayKey) ?? []}
            technicianColors={technicianColors}
            onNoteClick={onNoteClick}
          />
        ))}
      </div>
    </div>
  );
}
