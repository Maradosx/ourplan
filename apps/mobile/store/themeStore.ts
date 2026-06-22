import { create } from 'zustand';
import { THEMES, ThemeId, Theme } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { purchaseThemeProduct, restorePurchases } from '../lib/purchases';

const FREE_THEMES: ThemeId[] = ['midnight', 'daylight', 'blossom'];
const STORAGE_THEME = 'ourplan_theme';
const STORAGE_PURCHASED = 'ourplan_purchased_themes';

interface ThemeStore {
  themeId: ThemeId;
  theme: Theme;
  purchasedThemes: ThemeId[];
  setTheme: (id: ThemeId) => Promise<void>;
  loadTheme: () => Promise<void>;
  isUnlocked: (id: ThemeId) => boolean;
  purchaseTheme: (id: ThemeId) => Promise<void>;
  restoreThemes: () => Promise<string[]>;
  resetToFree: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themeId: 'midnight',
  theme: THEMES.midnight,
  purchasedThemes: [...FREE_THEMES],

  isUnlocked: (id: ThemeId) => {
    const { purchasedThemes } = get();
    if (purchasedThemes.includes(id)) return true;
    // Pro users unlock all themes automatically
    try {
      const { useProStore } = require('./proStore') as { useProStore: { getState: () => { isPro: boolean } } };
      return !!useProStore.getState().isPro;
    } catch { return false; }
  },

  setTheme: async (id: ThemeId) => {
    if (!get().isUnlocked(id)) return;
    await AsyncStorage.setItem(STORAGE_THEME, id);
    set({ themeId: id, theme: THEMES[id] as Theme });
  },

  purchaseTheme: async (id: ThemeId) => {
    const current = get().purchasedThemes;
    if (current.includes(id)) return;
    // RevenueCat — ในโหมด dev จะ mock อัตโนมัติ ถ้ายังไม่ได้ set up App Store
    const success = await purchaseThemeProduct(id);
    if (!success) throw new Error('Purchase was not completed.');
    const updated = [...current, id];
    await AsyncStorage.setItem(STORAGE_PURCHASED, JSON.stringify(updated));
    set({ purchasedThemes: updated });
  },

  restoreThemes: async () => {
    const restored = await restorePurchases();
    if (restored.length > 0) {
      const current = get().purchasedThemes;
      const updated = [...new Set([...current, ...restored])] as ThemeId[];
      await AsyncStorage.setItem(STORAGE_PURCHASED, JSON.stringify(updated));
      set({ purchasedThemes: updated });
    }
    return restored;
  },

  loadTheme: async () => {
    const [savedTheme, savedPurchased] = await Promise.all([
      AsyncStorage.getItem(STORAGE_THEME),
      AsyncStorage.getItem(STORAGE_PURCHASED),
    ]);

    let purchased: ThemeId[] = [...FREE_THEMES];
    if (savedPurchased) {
      try {
        const parsed: ThemeId[] = JSON.parse(savedPurchased);
        purchased = [...new Set([...FREE_THEMES, ...parsed])];
      } catch {}
    }

    const updates: Partial<ThemeStore> = { purchasedThemes: purchased };
    if (savedTheme && savedTheme in THEMES && purchased.includes(savedTheme as ThemeId)) {
      const id = savedTheme as ThemeId;
      updates.themeId = id;
      updates.theme = THEMES[id] as Theme;
    }
    set(updates);
  },

  // Revert to the default free theme and lock premium themes — called on logout so a
  // premium theme/unlock from the previous account doesn't carry over on a shared device.
  resetToFree: async () => {
    await AsyncStorage.multiRemove([STORAGE_THEME, STORAGE_PURCHASED]);
    set({ themeId: 'midnight', theme: THEMES.midnight as Theme, purchasedThemes: [...FREE_THEMES] });
  },
}));
