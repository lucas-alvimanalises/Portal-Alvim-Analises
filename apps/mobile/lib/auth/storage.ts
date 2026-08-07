import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'portal_alvim_access_token';
const REFRESH_TOKEN_KEY = 'portal_alvim_refresh_token';

// expo-secure-store não tem implementação web (é Keychain/Keystore nativo).
// Como o app também roda em web (app.json já configura output web), usamos
// localStorage nesse caso — sem a mesma garantia de segurança do SecureStore,
// mas suficiente para desenvolvimento/demo do portal web administrativo.
const isWeb = Platform.OS === 'web';

export const tokenStorage = {
  async getAccessToken() {
    return isWeb ? localStorage.getItem(ACCESS_TOKEN_KEY) : SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken() {
    return isWeb
      ? localStorage.getItem(REFRESH_TOKEN_KEY)
      : SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string) {
    if (isWeb) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  async clear() {
    if (isWeb) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
