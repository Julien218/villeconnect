// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from '@/shared/auth-context';
import { ThemeProvider, useTheme } from '@/shared/theme-context';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.colors.bgDeep} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bgDeep },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { fontWeight: '800', fontFamily: theme.fonts.semibold },
          contentStyle: { backgroundColor: theme.colors.bgDeep },
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
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </AuthProvider>
  );
}
