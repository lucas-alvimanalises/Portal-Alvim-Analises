'use client';

import { useEffect, useRef, useState } from 'react';

interface DateInputProps {
  // Mesmo formato do <input type="date"> nativo que substitui: 'YYYY-MM-DD'
  // ou '' quando vazio — nenhuma mudança de comportamento/dado, só de
  // componente (ver especificação de modernização visual).
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplay(value: string): string {
  const date = parseValue(value);
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

// Date picker customizado — substitui o <input type="date"> nativo (chrome
// do calendário controlado pelo navegador/SO, impossível de restilizar pra
// combinar com a identidade do portal) por um popover próprio, mesma
// paleta/raio/tipografia dos outros inputs (ver especificação de
// modernização visual, "campos de data customizados"). Valor de
// entrada/saída continua exatamente 'YYYY-MM-DD' — comportamento funcional
// idêntico ao componente nativo que substitui.
export function DateInput({ value, onChange, placeholder = 'dd/mm/aaaa' }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function openPicker() {
    setViewMonth(selected ?? new Date());
    setOpen(true);
  }

  function changeMonth(delta: number) {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function selectDay(day: number) {
    onChange(toValue(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)));
    setOpen(false);
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSelectedCell = (day: number) =>
    !!selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;

  const today = new Date();
  const isTodayCell = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        onClick={openPicker}
        style={{
          textAlign: 'left',
          cursor: 'pointer',
          color: value ? 'var(--color-text)' : 'var(--color-text-muted)',
          background: 'white',
        }}
      >
        {value ? formatDisplay(value) : placeholder}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 30,
            marginTop: 4,
            padding: 12,
            width: 260,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '2px 8px', fontSize: 12 }}
              onClick={() => changeMonth(-1)}
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <strong style={{ fontSize: 13 }}>
              {MONTH_LABELS[month]} {year}
            </strong>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '2px 8px', fontSize: 12 }}
              onClick={() => changeMonth(1)}
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  padding: '2px 0',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                disabled={day === null}
                onClick={() => day !== null && selectDay(day)}
                style={{
                  aspectRatio: '1',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  cursor: day === null ? 'default' : 'pointer',
                  background: day !== null && isSelectedCell(day) ? 'var(--color-primary)' : 'transparent',
                  color:
                    day === null
                      ? 'transparent'
                      : isSelectedCell(day)
                        ? 'white'
                        : isTodayCell(day)
                          ? 'var(--color-primary)'
                          : 'var(--color-text)',
                  fontWeight: day !== null && (isSelectedCell(day) || isTodayCell(day)) ? 700 : 400,
                }}
              >
                {day ?? ''}
              </button>
            ))}
          </div>

          {value && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 10, fontSize: 12, padding: '4px 0' }}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
