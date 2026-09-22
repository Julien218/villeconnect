// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/shared/auth-context';
import { ThemeProvider, useTheme } from '@/shared/theme-context';
import { useReducedMotion } from 'react-native-reanimated';
import { WebStackTransition, TRANSITION_DURATION } from '@/components/screen-transition';
import { NeonNavigationGlow } from '@/components/neon-navigation-glow';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  return (
    <>
      <StatusBar style={theme.statusBarStyle} />
      <Stack
        screenLayout={({ children }) => <WebStackTransition>{children}</WebStackTransition>}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bgDeep },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { fontWeight: '800', fontFamily: theme.fonts.semibold },
          contentStyle: { backgroundColor: theme.colors.bgDeep },
          animation: reducedMotion ? 'none' : 'fade_from_bottom',
          animationDuration: reducedMotion ? 0 : TRANSITION_DURATION,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="services" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Page introuvable' }} />
      </Stack>
      <NeonNavigationGlow />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <ThemedStack />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
