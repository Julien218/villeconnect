// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/shared/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0A0F1E" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0F1E' },
          headerTintColor: '#F9FAFB',
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: '#0A0F1E' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Page introuvable' }} />
      </Stack>
    </AuthProvider>
  );
}
