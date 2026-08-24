import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ColorPalette, darkColors, lightColors } from './palettes';
import { themeStorage } from './storage';

export type Scheme = 'light' | 'dark';

interface ThemeContextValue {
  scheme: Scheme;
  colors: ColorPalette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Padrão do portal web: sem preferência salva ainda, segue o tema do
// sistema; a partir do primeiro toggle, a escolha do usuário passa a
// mandar (persistida, ver lib/theme/storage.ts) até ele trocar de novo.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [scheme, setScheme] = useState<Scheme>(systemScheme === 'dark' ? 'dark' : 'light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    themeStorage.get().then((stored) => {
      if (stored) {
        setScheme(stored);
      } else if (systemScheme === 'dark' || systemScheme === 'light') {
        setScheme(systemScheme);
      }
      setLoaded(true);
    });
    // Só na montagem — depois disso quem manda é o toggle explícito, não
    // mudanças posteriores do sistema (mesmo critério do portal web).
  }, []);

  function toggleTheme() {
    setScheme((current) => {
      const next: Scheme = current === 'dark' ? 'light' : 'dark';
      themeStorage.set(next);
      return next;
    });
  }

  // Evita um flash de light->dark logo depois do preference carregar do
  // storage — só renderiza os filhos (que dependem de useThemeColors) após
  // resolver a preferência salva.
  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ scheme, colors: scheme === 'dark' ? darkColors : lightColors, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de <ThemeProvider>.');
  }
  return context;
}

export function useThemeColors(): ColorPalette {
  return useTheme().colors;
}
