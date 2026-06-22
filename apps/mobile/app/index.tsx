import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export default function Index() {
  const { isAuthenticated, sessionLoaded } = useAuthStore();
  const { theme } = useThemeStore();

  // Wait for the persisted-session check to finish before deciding where to go,
  // otherwise an authenticated user is briefly redirected to /welcome and stuck there.
  if (!sessionLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/home' : '/(auth)/welcome'} />;
}
