import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAppStore, initDummyAuth } from '../store/useAppStore';

export default function RootLayout() {
  // Auto-init dummy auth so app always has a user for testing
  useEffect(() => {
    initDummyAuth();
  }, []);

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
    </>
  );
}
