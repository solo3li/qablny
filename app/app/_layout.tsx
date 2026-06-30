import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { ActiveCallModal } from '../components/ActiveCallModal';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { 
  useFonts, 
  PlusJakartaSans_400Regular, 
  PlusJakartaSans_500Medium, 
  PlusJakartaSans_600SemiBold, 
  PlusJakartaSans_700Bold, 
  PlusJakartaSans_800ExtraBold 
} from '@expo-google-fonts/plus-jakarta-sans';

export default function RootLayout() {
  const { checkAuth, token, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  usePushNotifications();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'chat';
    const inAuthGroup = segments[0] === 'auth';

    if (!token && inProtectedGroup) {
      // Redirect to login if user is not authenticated but tries to access protected routes
      router.replace('/auth/login');
    } else if (token && inAuthGroup) {
      // Redirect to home if user is authenticated but tries to access login screen
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, rootNavigationState?.key]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'fade',
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      </Stack>
      <ActiveCallModal />
      <IncomingCallModal />
    </>
  );
}
