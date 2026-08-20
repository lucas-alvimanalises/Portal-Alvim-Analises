'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme/ThemeContext';

// Botão único no cabeçalho do portal (mesmo header pra ADMIN/MANAGER/
// TECHNICIAN/CLIENT, ver (portal)/layout.tsx) — qualquer perfil logado
// enxerga e pode alternar. A preferência fica salva por navegador
// (localStorage), não por usuário/conta.
export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={toggleTheme}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      style={{ padding: '8px 10px' }}
    >
      {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}
