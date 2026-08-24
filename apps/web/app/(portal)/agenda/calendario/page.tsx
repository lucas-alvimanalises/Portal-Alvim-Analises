'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CalendarNoteDto, Role, ScheduleDto, ScheduleStatus } from '@portal-alvim/shared';
import { schedulesApi } from '../../../../lib/api/schedules.api';
import { usersApi } from '../../../../lib/api/users.api';
import { calendarNotesApi } from '../../../../lib/api/calendar-notes.api';
import { CalendarGrid } from '../../../../components/agenda/CalendarGrid';
import { ToBeScheduledPanel } from '../../../../components/agenda/ToBeScheduledPanel';
import { ConfirmDropModal } from '../../../../components/agenda/ConfirmDropModal';
import { TechnicianLegend } from '../../../../components/agenda/TechnicianLegend';
import { DayNoteModal } from '../../../../components/agenda/DayNoteModal';
import { buildTechnicianColorMap } from '../../../../lib/agenda/technician-colors';
import { TableSkeleton } from '../../../../components/shared/Skeleton';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toUtcDate(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
}

// Serviços de mais de um dia (endDate) precisam aparecer em TODOS os dias
// do intervalo no grid, não só no dia de início.
function eachDayKeyInRange(startIso: string, endIso: string | null): string[] {
  const start = toUtcDate(startIso);
  const end = endIso ? toUtcDate(endIso) : start;
  const keys: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    keys.push(new Date(t).toISOString().slice(0, 10));
  }
  return keys;
}

// Calendário mensal de despacho — arrastar um serviço "a agendar" (só mês
// previsto, ver Schedule.dateConfirmed) pra um dia grava a data exata +
// técnico numa modal (ver ConfirmDropModal), reaproveitando o mesmo
// schedulesApi.update() já usado pela tela de edição. Sem endpoint novo:
// busca todos os agendamentos (igual ScheduleListView já faz hoje) e separa
// em memória entre "no grid" (data confirmada, mesmo mês) e "a agendar"
// (mês previsto igual ao exibido).
export default function CalendarioPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [pendingDrop, setPendingDrop] = useState<{ schedule: ScheduleDto; dayKey: string } | null>(
    null,
  );
  const [noteEditor, setNoteEditor] = useState<{ dayKey: string; note: CalendarNoteDto | null } | null>(
    null,
  );

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => schedulesApi.list(),
  });

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const { data: notes } = useQuery({ queryKey: ['calendar-notes'], queryFn: calendarNotesApi.list });

  // Distância mínima antes de virar "arraste" — sem isso, um clique simples
  // (sem mover o mouse) já dispararia a lógica de drag e o onClick do
  // ScheduleCard (abrir edição) nunca rodaria.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeSchedules = (schedules ?? []).filter((s) => s.status !== ScheduleStatus.CANCELLED);

  // Gestor e Admin também podem ir a campo como responsável — mesma lista
  // de pessoas elegíveis usada no seletor de técnico (ver
  // ScheduleForm/ConfirmDropModal).
  const technicalStaff = (users ?? [])
    .filter((u) => u.role === Role.TECHNICIAN || u.role === Role.MANAGER || u.role === Role.ADMIN)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const technicianColors = buildTechnicianColorMap(technicalStaff);

  const monthStart = new Date(Date.UTC(cursor.year, cursor.month, 1));
  const monthEnd = new Date(Date.UTC(cursor.year, cursor.month + 1, 0));

  const scheduledInMonth = activeSchedules.filter((s) => {
    if (!s.dateConfirmed) return false;
    const start = toUtcDate(s.scheduledDate);
    const end = s.endDate ? toUtcDate(s.endDate) : start;
    return start <= monthEnd && end >= monthStart;
  });

  const toBeScheduled = activeSchedules.filter((s) => {
    if (s.dateConfirmed) return false;
    const d = new Date(s.scheduledDate);
    return d.getUTCFullYear() === cursor.year && d.getUTCMonth() === cursor.month;
  });

  const schedulesByDay = new Map<string, ScheduleDto[]>();
  scheduledInMonth.forEach((s) => {
    eachDayKeyInRange(s.scheduledDate, s.endDate).forEach((key) => {
      const list = schedulesByDay.get(key) ?? [];
      list.push(s);
      schedulesByDay.set(key, list);
    });
  });

  const notesByDay = new Map<string, CalendarNoteDto[]>();
  (notes ?? []).forEach((note) => {
    const key = note.date.slice(0, 10);
    const list = notesByDay.get(key) ?? [];
    list.push(note);
    notesByDay.set(key, list);
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('day-')) return;
    const dayKey = overId.slice('day-'.length);
    const schedule = active.data.current?.schedule as ScheduleDto | undefined;
    if (!schedule) return;
    setPendingDrop({ schedule, dayKey });
  }

  function changeMonth(delta: number) {
    setCursor((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Calendário</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary" onClick={() => changeMonth(-1)}>
          ‹ Anterior
        </button>
        <strong style={{ fontSize: 16 }}>
          {MONTH_LABELS[cursor.month]} de {cursor.year}
        </strong>
        <button type="button" className="btn btn-secondary" onClick={() => changeMonth(1)}>
          Próximo ›
        </button>
      </div>

      <TechnicianLegend people={technicalStaff} colors={technicianColors} />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 3, minWidth: 0 }}>
              <CalendarGrid
                year={cursor.year}
                month={cursor.month}
                schedulesByDay={schedulesByDay}
                notesByDay={notesByDay}
                technicianColors={technicianColors}
                onNoteClick={(dayKey, note) => setNoteEditor({ dayKey, note })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <ToBeScheduledPanel schedules={toBeScheduled} technicianColors={technicianColors} />
            </div>
          </div>
        </DndContext>
      )}

      {pendingDrop && (
        <ConfirmDropModal
          schedule={pendingDrop.schedule}
          targetDayKey={pendingDrop.dayKey}
          onClose={() => setPendingDrop(null)}
        />
      )}

      {noteEditor && (
        <DayNoteModal
          dayKey={noteEditor.dayKey}
          note={noteEditor.note}
          people={technicalStaff}
          colors={technicianColors}
          onClose={() => setNoteEditor(null)}
        />
      )}
    </div>
  );
}
