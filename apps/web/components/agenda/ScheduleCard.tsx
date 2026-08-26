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
  // Uma cor por técnico responsável, na mesma ordem de schedule.technicians
  // (ver CalendarGrid/ToBeScheduledPanel) — serviço com só 1 técnico continua
  // um fundo sólido; com 2+ o fundo vira listras, uma por técnico (pedido do
  // usuário: enxergar de relance todo mundo alocado, não só o primeiro).
  colors?: TechnicianColor[];
}

// Fundo com várias cores vira listras verticais de largura igual, com corte
// duro (sem degradê) entre elas — cada cor ocupa exatamente 1/N do card.
function buildStripedBackground(backgrounds: string[]): string {
  const step = 100 / backgrounds.length;
  const stops = backgrounds.flatMap((bg, i) => [`${bg} ${i * step}%`, `${bg} ${(i + 1) * step}%`]);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

// Com 2+ técnicos as listras têm cores diferentes entre si — não dá pra usar
// a cor de texto pareada de UMA cor só (ficaria ilegível nas outras listras).
// Um neutro escuro fixo lê bem em cima de qualquer cor da paleta (todas
// pastéis claros, ver technician-colors.ts), em claro ou escuro, já que o
// fundo aqui nunca acompanha o tema mesmo.
const MULTI_COLOR_TEXT = '#1c1f24';

// Card compacto (empresa — serviço — técnico) usado tanto no painel "a
// agendar" quanto nas células do calendário — é o mesmo elemento arrastável
// nos dois lugares (ver CalendarGrid/ToBeScheduledPanel). Clique (sem
// arrastar) abre um menu com duas ações — o PointerSensor do DndContext pai
// tem uma distância mínima de ativação, então um clique sem movimento nunca
// é interpretado como início de arraste.
export function ScheduleCard({ schedule, origin, dayKey, colors }: ScheduleCardProps) {
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

  const validColors = colors ?? [];
  const primaryColor = validColors[0];
  const cardBackground =
    validColors.length > 1
      ? buildStripedBackground(validColors.map((c) => c.background))
      : primaryColor?.background;
  const cardTextColor = validColors.length > 1 ? MULTI_COLOR_TEXT : primaryColor?.text;

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
        background: cardBackground,
        borderColor: primaryColor?.border,
        borderLeft: primaryColor ? `3px solid ${primaryColor.border}` : undefined,
        // Fundo do card é pastel fixo (não segue o tema, ver
        // technician-colors.ts) — a cor do texto precisa ser a `text`
        // pareada com ele (ou o neutro fixo quando são várias listras),
        // nunca a `var(--color-text)` do tema: no modo escuro ela vira
        // quase-branco e ficava ilegível em cima desses fundos claros (bug
        // real, achado pelo usuário).
        color: cardTextColor,
      }}
    >
      <div style={{ fontWeight: 600 }}>{schedule.clientName}</div>
      <div style={{ opacity: cardTextColor ? 0.8 : 1, color: cardTextColor ? undefined : 'var(--color-text-muted)' }}>
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
            opacity: hasNoTechnician ? (cardTextColor ? 0.8 : 1) : 1,
            color: hasNoTechnician && !cardTextColor ? 'var(--color-text-muted)' : 'inherit',
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
