import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Must include the /api/v1 global prefix — the API mounts every route under it.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('ourplan_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = await AsyncStorage.getItem('ourplan_refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
          await AsyncStorage.setItem('ourplan_token', data.accessToken);
          // The API rotates refresh tokens (the old one is deleted server-side), so the
          // new refresh token MUST be persisted or the next refresh will fail and log the
          // user out. Older builds dropped it here.
          if (data.refreshToken) {
            await AsyncStorage.setItem('ourplan_refresh', data.refreshToken);
          }
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          await AsyncStorage.multiRemove(['ourplan_token', 'ourplan_refresh']);
          const { router } = require('expo-router');
          router.replace('/(auth)/welcome');
        }
      }
    }
    return Promise.reject(error);
  }
);
