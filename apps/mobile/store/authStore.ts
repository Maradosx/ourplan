import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  profileSlug: string;
  bio: string | null;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionLoaded: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  setUser: (user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isAuthenticated: false,
  sessionLoaded: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('ourplan_token', data.accessToken);
      await AsyncStorage.setItem('ourplan_refresh', data.refreshToken);
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
      // Re-derive Pro/theme entitlements for the freshly authenticated account.
      try { await require('./proStore').useProStore.getState().loadStatus(); } catch {}
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', payload);
      await AsyncStorage.setItem('ourplan_token', data.accessToken);
      await AsyncStorage.setItem('ourplan_refresh', data.refreshToken);
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
      // Re-derive Pro/theme entitlements for the freshly created account.
      try { await require('./proStore').useProStore.getState().loadStatus(); } catch {}
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['ourplan_token', 'ourplan_refresh']);
    set({ user: null, accessToken: null, isAuthenticated: false });
    // Reset the other in-memory stores + their persisted unlock state so the next
    // account on this device starts clean (lazy require avoids circular imports).
    try {
      require('./scheduleStore').useScheduleStore.getState().reset();
      require('./quickShiftStore').useQuickShiftStore.getState().clear();
      await require('./proStore').useProStore.getState().reset();
      await require('./themeStore').useThemeStore.getState().resetToFree();
    } catch {
      /* non-critical */
    }
  },

  setUser: (user: User) => set({ user }),

  loadSession: async () => {
    try {
      const token = await AsyncStorage.getItem('ourplan_token');
      if (!token) return;
      const { data } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ user: data, accessToken: token, isAuthenticated: true });
    } catch {
      await AsyncStorage.multiRemove(['ourplan_token', 'ourplan_refresh']);
    } finally {
      // Always mark the session check complete so the root index can stop showing
      // its loading state and route correctly (prevents a logged-in user from being
      // bounced to the welcome screen on cold start).
      set({ sessionLoaded: true });
    }
  },
}));
