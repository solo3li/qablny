import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { ActiveCallModal } from '../components/ActiveCallModal';
import { FloatingMiniPlayer } from '../components/FloatingMiniPlayer';
import { VoiceRoomAudioHandler } from '../components/VoiceRoomAudioHandler';
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

  // 1. Prevent Chrome extension unhandled promise rejections
  // (e.g. "Error: Could not establish connection. Receiving end does not exist.")
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = reason?.message || String(reason || '');
      if (
        msg.includes('Could not establish connection') ||
        msg.includes('Receiving end does not exist') ||
        msg.includes('message port closed') ||
        msg.includes('Extension context invalidated')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // 2. Prevent "Blocked aria-hidden on an element because its descendant retained focus" on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Blur active element on any route/segment change
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function' && active !== document.body) {
        active.blur();
      }
    } catch (e) {
      // ignore
    }

    // MutationObserver to immediately blur any active element if its ancestor becomes aria-hidden
    if (typeof MutationObserver !== 'undefined' && document.body) {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'aria-hidden') {
            const target = m.target as HTMLElement;
            if (target && target.getAttribute('aria-hidden') === 'true') {
              if (document.activeElement && target.contains(document.activeElement)) {
                (document.activeElement as HTMLElement).blur?.();
              }
            }
          }
        }
      });

      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['aria-hidden'],
      });

      return () => observer.disconnect();
    }
  }, [segments]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading || !rootNavigationState?.key) return;

    const inProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'map' || segments[0] === 'chat' || segments[0] === 'support' || segments[0] === 'privacy' || segments[0] === 'explore' || segments[0] === 'add-friend' || segments[0] === 'boost' || segments[0] === 'room';
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
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'fade',
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'slide_from_left' }} />
        <Stack.Screen name="privacy" options={{ headerShown: false, animation: 'slide_from_left' }} />
        <Stack.Screen name="support/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="support/create" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="support/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="add-friend" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="boost" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="room/[id]" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="map" options={{ headerShown: false }} />
      </Stack>
      <ActiveCallModal />
      <IncomingCallModal />
      <VoiceRoomAudioHandler />
      <FloatingMiniPlayer />
    </>
  );
}
