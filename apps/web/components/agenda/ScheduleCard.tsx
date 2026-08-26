'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDraggable } from '@dnd-kit/core';
import { ScheduleDto } from '@portal-alvim/shared';
import { TechnicianColor } from '../../lib/agenda/technician-colors';

interface ScheduleCardProps {
  schedule: ScheduleDto;
  // 'panel': ainda sem data exata, dentro do painel "a agendar". 'day': já
  // colocado num dia do calendário (arrastável pra outro dia = reagendar).
  origin: 'panel' | 'day';
  // Só pra 'day': serviços de mais de um dia (endDate) renderizam o MESMO
  // schedule.id em várias células — precisa entrar no id de arraste do
  // dnd-kit pra cada cópia ser um draggable distinto.
  dayKey?: string;
  color?: TechnicianColor;
}

// Card compacto (empresa — serviço — técnico) usado tanto no painel "a
// agendar" quanto nas células do calendário — é o mesmo elemento arrastável
// nos dois lugares (ver CalendarGrid/ToBeScheduledPanel). Clique (sem
// arrastar) abre um menu com duas ações — o PointerSensor do DndContext pai
// tem uma distância mínima de ativação, então um clique sem movimento nunca
// é interpretado como início de arraste.
export function ScheduleCard({ schedule, origin, dayKey, color }: ScheduleCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const draggableId = origin === 'day' ? `day-card-${dayKey}-${schedule.id}` : `panel-card-${schedule.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    // onDragEnd só recebe o id de arraste (composto acima) — a modal de
    // confirmação precisa do schedule de verdade, então ele viaja junto.
    data: { schedule },
  });

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const hasNoTechnician = schedule.technicians.length === 0;
  const technicianLabel = hasNoTechnician
    ? 'Sem técnico definido'
    : schedule.technicians.map((t) => t.name).join(', ');

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        menuRef.current = node;
      }}
      {...listeners}
      {...attributes}
      onClick={() => setMenuOpen((open) => !open)}
      className="card"
      style={{
        padding: '6px 8px',
        fontSize: 12,
        lineHeight: 1.4,
        cursor: 'grab',
        position: 'relative',
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging || menuOpen ? 10 : undefined,
        background: color?.background,
        borderColor: color?.border,
        borderLeft: color ? `3px solid ${color.border}` : undefined,
        // Fundo do card é um pastel fixo (não segue o tema, ver
        // technician-colors.ts) — a cor do texto precisa ser a `text`
        // pareada com ele, nunca a `var(--color-text)` do tema: no modo
        // escuro ela vira quase-branco e ficava ilegível em cima desses
        // fundos claros (bug real, achado pelo usuário).
        color: color?.text,
      }}
    >
      <div style={{ fontWeight: 600 }}>{schedule.clientName}</div>
      <div style={{ opacity: color ? 0.8 : 1, color: color ? undefined : 'var(--color-text-muted)' }}>
        {schedule.serviceTypeName}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {/* Só faz sentido alertar "sem técnico" pra um serviço que já tem
            data — o fluxo de drop sempre força escolher técnico, isso só
            cobre edição manual antiga que deixou o campo vazio. */}
        {hasNoTechnician && origin === 'day' && (
          <span
            className="badge"
            style={{ background: '#fef9c3', color: '#854d0e', fontSize: 10 }}
          >
            sem técnico
          </span>
        )}
        <span
          style={{
            opacity: hasNoTechnician ? (color ? 0.8 : 1) : 1,
            color: hasNoTechnician && !color ? 'var(--color-text-muted)' : 'inherit',
          }}
        >
          {technicianLabel}
        </span>
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: 180,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            cursor: 'default',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', fontWeight: 400 }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/agendamentos/${schedule.id}`);
            }}
          >
            Editar agendamento
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', fontWeight: 400 }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/agenda/organizar-servico/${schedule.id}`);
            }}
          >
            Organizar Serviço
          </button>
        </div>
      )}
    </div>
  );
}
