import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { useProStore } from '../store/proStore';
import { initPurchases } from '../lib/purchases';

// Pick a status-bar style that stays legible on top of the active theme bg.
// Light backgrounds need dark icons; dark backgrounds need light icons.
function statusBarStyleForBg(bg: string): 'light' | 'dark' {
  const hex = bg.replace('#', '');
  if (hex.length < 6) return 'light';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Perceived luminance (0–255). Bright bg → dark icons.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? 'dark' : 'light';
}

export default function RootLayout() {
  const { loadSession } = useAuthStore();
  const { loadTheme, theme } = useThemeStore();
  const { loadLang } = useLanguageStore();
  const { loadStatus: loadProStatus } = useProStore();

  // Preload Ionicons font so tab bar icons render immediately
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    initPurchases();
    loadTheme();
    loadSession();
    loadLang();
    loadProStatus();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={statusBarStyleForBg(theme.bg)} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/new" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="event/edit/[id]" />
        <Stack.Screen name="user/[slug]" />
        <Stack.Screen name="location/picker" />
        <Stack.Screen name="theme-shop" />
        <Stack.Screen name="pro-upgrade" />
        <Stack.Screen name="sticker-shop" />
        <Stack.Screen name="support-us" />
        <Stack.Screen name="settings/edit-profile" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/language" />
        <Stack.Screen name="groups/index" />
        <Stack.Screen name="groups/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
