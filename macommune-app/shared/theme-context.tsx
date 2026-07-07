// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Système de thème global : clair / sombre / automatique (suit le système).
// Préférence sauvegardée en local (AsyncStorage, dispo hors-connexion / invité)
// ET synchronisée sur le profil du compte connecté (theme_preference côté serveur),
// pour retrouver le même choix sur tous les appareils d'un même compte.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, ThemeMode, ColorScheme, ThemeTokens } from './theme';
import { useAuth } from './auth-context';

const STORAGE_KEY = 'macommune_theme_preference';

interface ThemeContextValue {
  mode: ThemeMode;                 // choix de l'utilisateur : light / dark / auto
  scheme: ColorScheme;              // rendu résolu actuel : light / dark
  theme: ThemeTokens;               // jetons de design pour le rendu résolu
  setMode: (mode: ThemeMode) => Promise<void>;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(
    (Appearance.getColorScheme() as ColorScheme) || 'dark'
  );
  const [isReady, setIsReady] = useState(false);
  // updateProfile est optionnel : le ThemeProvider doit fonctionner même avant
  // que l'AuthProvider soit monté (ordre défensif), donc on lit via un hook interne.
  const auth = useAuthSafe();

  // Suit les changements de thème système en direct (mode 'auto').
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme as ColorScheme) || 'dark');
    });
    return () => sub.remove();
  }, []);

  // Bootstrap : préférence locale d'abord (fonctionne aussi en invité, hors-ligne).
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setModeState(stored);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // Dès qu'un compte connecté a une préférence enregistrée côté serveur, elle
  // devient la source de vérité (permet de retrouver son thème sur un nouvel appareil).
  useEffect(() => {
    if (auth?.user?.themePreference) {
      const remote = auth.user.themePreference;
      if (remote === 'light' || remote === 'dark' || remote === 'auto') {
        setModeState(remote);
        AsyncStorage.setItem(STORAGE_KEY, remote).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.id]);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    // Si connecté : on pousse aussi la préférence sur le profil (dispo multi-appareil).
    if (auth?.isLoggedIn && auth.updateProfile) {
      try { await auth.updateProfile({ themePreference: next } as any); } catch { /* non bloquant */ }
    }
  }, [auth]);

  const scheme: ColorScheme = mode === 'auto' ? systemScheme : mode;
  const tokens = scheme === 'light' ? lightTheme : darkTheme;

  const value = useMemo<ThemeContextValue>(() => ({
    mode, scheme, theme: tokens, setMode, isReady,
  }), [mode, scheme, tokens, setMode, isReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Permet à ThemeProvider de lire useAuth() sans planter si jamais l'ordre des
// providers venait à changer — dégrade proprement en mode "invité local uniquement".
function useAuthSafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  } catch {
    return null;
  }
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé à l’intérieur d’un <ThemeProvider>');
  return ctx;
}
