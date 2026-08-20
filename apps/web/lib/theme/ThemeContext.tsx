'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'portal-alvim-theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Aplica o tema no <html> — mesma função usada pelo script inline no <head>
// (ver layout.tsx) e por toggleTheme aqui, pra nunca ficar dessincronizado.
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// Provider fininho: o valor inicial já vem certo do <html data-theme> que o
// script inline no <head> aplicou antes do React hidratar (evita o "flash"
// de tela clara antes de trocar pra escura) — aqui só lê de volta pro estado
// React reagir, não decide o tema sozinho.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de <ThemeProvider>.');
  }
  return context;
}

// Script inline injetado no <head> (ver layout.tsx) — roda ANTES do React
// hidratar, então a página nunca pisca clara antes de virar escura pra quem
// já escolheu esse tema. Não dá pra usar STORAGE_KEY/applyTheme daqui (é uma
// string crua injetada no HTML, sem acesso ao módulo) — mantém o mesmo nome
// de chave em sincronia manualmente.
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored === 'dark' ? 'dark' : (stored === 'light' ? 'light' : null);
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;
