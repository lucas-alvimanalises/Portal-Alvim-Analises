'use client';

// Cabeçalho de coluna com filtro escondido atrás de uma seta — economiza
// espaço vertical em vez de uma segunda linha de inputs sempre visível. Só
// um filtro fica aberto por vez (controlado pelo componente pai via
// isOpen/onToggle). Extraído de ScheduleListView.tsx pra reaproveitar o
// mesmo padrão de filtro por coluna em outras listas (ex.: Certificados
// Pendentes) sem duplicar a lógica de posicionamento/popover.
export function FilterableHeader({
  label,
  active,
  isOpen,
  onToggle,
  popoverRef,
  children,
}: {
  label: string;
  active: boolean;
  isOpen: boolean;
  onToggle: () => void;
  popoverRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <th style={{ position: 'relative' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Filtrar ${label}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            fontSize: 10,
            lineHeight: 1,
            color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
          }}
        >
          ▼
        </button>
      </span>
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 20,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: 8,
            marginTop: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            minWidth: 180,
          }}
        >
          {children}
        </div>
      )}
    </th>
  );
}
