'use client';

import { useRouter } from 'next/navigation';

// Volta um passo na navegação (histórico do browser) — usado no topo de
// todas as páginas do portal, ao lado do seletor de empresa.
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Voltar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 13,
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      Voltar
    </button>
  );
}
