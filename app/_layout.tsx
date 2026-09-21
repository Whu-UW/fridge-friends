import { useFonts } from 'expo-font';
import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '../context/AppContext';
import { setupForegroundHandler, addNotificationResponseListener } from '../services/notificationService';

// Must be called outside component for SDK 57 foreground notification display
setupForegroundHandler();

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('has_completed_onboarding');
        const inAuth = segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'onboarding';
        if (completed !== 'true' && !inAuth) {
          router.replace('/login');
        }
      } catch {}
    };

    checkOnboarding();
  }, [segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="rescue" />
      <Stack.Screen name="recipe/[id]" />
      <Stack.Screen name="friend/[id]" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Navigate to Meals tab when user taps a feast notification
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.url) {
        router.push(data.url as any);
      } else {
        router.push('/(tabs)/meals' as any);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AppProvider>
      <StatusBar style="auto" />
      <RootNavigation />
    </AppProvider>
  );
}
