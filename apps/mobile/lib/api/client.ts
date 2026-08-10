import axios from 'axios';
import { tokenStorage } from '../auth/storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

// Em 401, tenta renovar o access token uma vez usando o refresh token e
// repete a requisição original — mesmo padrão do web, adaptado para Axios.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw error;

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        await tokenStorage.setTokens(data.accessToken, data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await tokenStorage.clear();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  },
);
