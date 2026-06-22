import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkProStatus, purchaseProPlan, restoreProAndThemes,
  purchaseStickerPack, getOwnedStickerPacks, sendTip,
  IS_CONFIGURED,
} from '../lib/purchases';

const KEY_PRO      = 'ourplan_is_pro';
const KEY_STICKERS = 'ourplan_stickers';
const STORAGE_THEME     = 'ourplan_theme';
const STORAGE_PURCHASED = 'ourplan_purchased_themes';

/**
 * Unlock all themes for Pro users and restore any saved premium theme.
 * Called lazily (require) to avoid circular imports between stores.
 */
async function syncProThemes() {
  try {
    const { useThemeStore } = require('./themeStore') as { useThemeStore: { getState: () => any; setState: (fn: any) => void } };
    const { THEMES } = require('../constants/theme') as { THEMES: Record<string, any> };
    const allIds = Object.keys(THEMES);

    // Unlock every theme
    useThemeStore.setState({ purchasedThemes: allIds });
    await AsyncStorage.setItem(STORAGE_PURCHASED, JSON.stringify(allIds));

    // Re-apply saved premium theme (loadTheme may have skipped it if Pro wasn't loaded yet)
    const savedTheme = await AsyncStorage.getItem(STORAGE_THEME);
    if (savedTheme && savedTheme in THEMES) {
      useThemeStore.setState({ themeId: savedTheme, theme: THEMES[savedTheme] });
    }
  } catch { /* non-critical */ }
}

interface ProState {
  isPro: boolean;
  ownedStickerPacks: string[];
  isLoading: boolean;

  loadStatus: () => Promise<void>;
  purchasePro: (plan: 'monthly' | 'yearly') => Promise<boolean>;
  restoreAll: () => Promise<{ isPro: boolean; themeIds: string[] }>;
  buyStickers: (packId: string) => Promise<boolean>;
  isStickerOwned: (packId: string) => boolean;
  tipDev: (level: 'small' | 'medium' | 'large') => Promise<boolean>;
  reset: () => Promise<void>;
}

export const useProStore = create<ProState>((set, get) => ({
  isPro: false,
  ownedStickerPacks: [],
  isLoading: true,

  loadStatus: async () => {
    set({ isLoading: true });

    // Dev mode with placeholder RC keys: rely on cached status so test purchases persist
    if (!IS_CONFIGURED) {
      const [[, rawPro], [, rawStickers]] = await AsyncStorage.multiGet([KEY_PRO, KEY_STICKERS]);
      const cachedPro = rawPro ? (JSON.parse(rawPro) as boolean) : false;
      set({ isPro: cachedPro, ownedStickerPacks: rawStickers ? JSON.parse(rawStickers) : [], isLoading: false });
      if (cachedPro) await syncProThemes();
      return;
    }

    try {
      const [isPro, stickers] = await Promise.all([
        checkProStatus(),
        getOwnedStickerPacks(),
      ]);
      set({ isPro, ownedStickerPacks: stickers });
      await AsyncStorage.multiSet([
        [KEY_PRO,      JSON.stringify(isPro)],
        [KEY_STICKERS, JSON.stringify(stickers)],
      ]);
      // Sync all themes + restore saved premium theme for Pro users
      if (isPro) await syncProThemes();
    } catch {
      // Offline fallback
      const [[, rawPro], [, rawStickers]] = await AsyncStorage.multiGet([KEY_PRO, KEY_STICKERS]);
      const cachedPro = rawPro ? JSON.parse(rawPro) as boolean : false;
      if (rawPro)      set({ isPro: cachedPro });
      if (rawStickers) set({ ownedStickerPacks: JSON.parse(rawStickers) });
      if (cachedPro)   await syncProThemes();
    } finally {
      set({ isLoading: false });
    }
  },

  purchasePro: async (plan) => {
    const ok = await purchaseProPlan(plan);
    if (ok) {
      set({ isPro: true });
      await AsyncStorage.setItem(KEY_PRO, 'true');
      await syncProThemes(); // unlock all themes immediately
    }
    return ok;
  },

  restoreAll: async () => {
    const result = await restoreProAndThemes();
    set({ isPro: result.isPro });
    await AsyncStorage.setItem(KEY_PRO, JSON.stringify(result.isPro));
    if (result.isPro) await syncProThemes(); // unlock all themes if Pro restored
    return result;
  },

  buyStickers: async (packId) => {
    const ok = await purchaseStickerPack(packId);
    if (ok) {
      const current = get().ownedStickerPacks;
      if (!current.includes(packId)) {
        const updated = [...current, packId];
        set({ ownedStickerPacks: updated });
        await AsyncStorage.setItem(KEY_STICKERS, JSON.stringify(updated));
      }
    }
    return ok;
  },

  isStickerOwned: (packId) => get().ownedStickerPacks.includes(packId),

  tipDev: async (level) => sendTip(level),

  // Clear cached Pro/sticker entitlements on logout so they don't leak to the next
  // account on a shared device. Real entitlements are re-derived by loadStatus().
  reset: async () => {
    await AsyncStorage.multiRemove([KEY_PRO, KEY_STICKERS]);
    set({ isPro: false, ownedStickerPacks: [] });
  },
}));
