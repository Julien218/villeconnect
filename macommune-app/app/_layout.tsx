// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
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
        <Stack.Screen name="+not-found" options={{ title: 'Page introuvable' }} />
      </Stack>
    </>
  );
}
