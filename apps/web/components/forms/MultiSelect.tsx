'use client';

import { useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
}

// Combobox fechado por padrão (igual um <select>), mas permite marcar várias
// opções num painel rolável — evita a lista de checkboxes crescer sem limite
// na tela quando há muitas empresas cadastradas.
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  emptyMessage = 'Nenhuma opção disponível.',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selecionados`;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        style={{
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: selectedLabels.length === 0 ? 'var(--color-text-muted)' : 'inherit' }}>
          {summary}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 20,
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
              {emptyMessage}
            </div>
          )}
          {options.map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                fontSize: 14,
                fontWeight: 400,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleOption(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
