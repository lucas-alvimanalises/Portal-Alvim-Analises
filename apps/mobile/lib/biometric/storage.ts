import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'portal_alvim_biometric_enabled';

// Mesmo padrão de lib/auth/storage.ts e lib/theme/storage.ts: SecureStore
// no nativo, localStorage no web (sem implementação de SecureStore lá).
const isWeb = Platform.OS === 'web';

export const biometricStorage = {
  async isEnabled(): Promise<boolean> {
    const value = isWeb
      ? localStorage.getItem(BIOMETRIC_ENABLED_KEY)
      : await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  },
  async setEnabled(enabled: boolean) {
    const value = enabled ? 'true' : 'false';
    if (isWeb) {
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, value);
      return;
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, value);
  },
};
