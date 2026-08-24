import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'portal_alvim_theme';

// Mesmo padrão de lib/auth/storage.ts: expo-secure-store não tem
// implementação web, então usa localStorage nesse caso. Preferência de tema
// não é sensível — só reaproveita o SecureStore que já era dependência (sem
// puxar AsyncStorage como dependência nativa nova só pra isso).
const isWeb = Platform.OS === 'web';

export type ThemePreference = 'light' | 'dark' | null;

export const themeStorage = {
  async get(): Promise<ThemePreference> {
    const value = isWeb ? localStorage.getItem(THEME_KEY) : await SecureStore.getItemAsync(THEME_KEY);
    return value === 'dark' ? 'dark' : value === 'light' ? 'light' : null;
  },
  async set(theme: 'light' | 'dark') {
    if (isWeb) {
      localStorage.setItem(THEME_KEY, theme);
      return;
    }
    await SecureStore.setItemAsync(THEME_KEY, theme);
  },
};
