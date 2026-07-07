// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Contexte d'authentification citoyenne — session persistante (access + refresh token),
// refresh silencieux périodique, et actions register/login/logout/updateProfile.
// Ne journalise et n'affiche JAMAIS les tokens (uniquement en mémoire + AsyncStorage).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcMutation, trpcQuery, setAccessToken, getOpenId } from './api-client';

const REFRESH_KEY = 'macommune_user_refresh_token';
// L'access token vit uniquement en mémoire (module api-client) — jamais persisté en clair,
// il est re-obtenu au démarrage via le refresh token stocké.
const REFRESH_INTERVAL_MS = 12 * 60 * 1000; // access token TTL = 15min côté serveur

export interface AuthUser {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  postalCode?: string | null;
  city?: string | null;
  emailVerified: boolean;
}

interface RegisterInput {
  email: string;
  password: string;
  postalCode?: string;
  city?: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (input: RegisterInput) => Promise<{ ok: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (fields: { name?: string; postalCode?: string; city?: string }) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistTokens = useCallback(async (access: string | null, refresh: string | null) => {
    setAccessToken(access);
    refreshTokenRef.current = refresh;
    try {
      if (refresh) await AsyncStorage.setItem(REFRESH_KEY, refresh);
      else await AsyncStorage.removeItem(REFRESH_KEY);
    } catch { /* ignore stockage indisponible */ }
  }, []);

  const fetchMe = useCallback(async () => {
    const { data } = await trpcQuery<AuthUser>('auth.me', {}, { authenticated: true });
    if (data) setUser(data);
    return data;
  }, []);

  const clearSession = useCallback(async () => {
    await persistTokens(null, null);
    setUser(null);
  }, [persistTokens]);

  const doRefresh = useCallback(async (refresh: string) => {
    const deviceOpenId = await getOpenId();
    const { data } = await trpcMutation<{ accessToken: string; refreshToken: string }>(
      'auth.refresh',
      { refreshToken: refresh, deviceOpenId, platform: Platform.OS }
    );
    if (!data) {
      await clearSession();
      return false;
    }
    await persistTokens(data.accessToken, data.refreshToken);
    return true;
  }, [clearSession, persistTokens]);

  // Bootstrap : tente de restaurer la session au démarrage via le refresh token stocké.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(REFRESH_KEY);
        if (stored) {
          const ok = await doRefresh(stored);
          if (ok) await fetchMe();
        }
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh silencieux périodique tant qu'une session est active.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (user) {
      intervalRef.current = setInterval(async () => {
        const refresh = refreshTokenRef.current;
        if (refresh) await doRefresh(refresh);
      }, REFRESH_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, doRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    // Transmet l'openId de CET appareil : si un wallet invité y était attaché,
    // le serveur le fusionne automatiquement dans le compte qu'on authentifie ici.
    const deviceOpenId = await getOpenId();
    const { data, error } = await trpcMutation<{
      accessToken: string; refreshToken: string;
      user: { id: number; email: string; role: string; emailVerified: boolean };
    }>('auth.login', { email, password, deviceOpenId, platform: Platform.OS });
    if (error || !data) return { ok: false, error: error || 'Erreur inconnue' };

    await persistTokens(data.accessToken, data.refreshToken);
    setUser({ id: data.user.id, email: data.user.email, role: data.user.role, emailVerified: data.user.emailVerified });
    await fetchMe(); // complète name/postalCode/city
    return { ok: true };
  }, [persistTokens, fetchMe]);

  const register = useCallback(async (input: RegisterInput) => {
    // Rattache le wallet CivicLoop anonyme existant (device) au nouveau compte, si présent.
    const deviceOpenId = await getOpenId();
    const { data, error } = await trpcMutation<{ success: boolean; message: string }>(
      'auth.register',
      { ...input, deviceOpenId }
    );
    if (error || !data) return { ok: false, error: error || 'Erreur inconnue' };
    return { ok: true, message: data.message };
  }, []);

  const logout = useCallback(async () => {
    const refresh = refreshTokenRef.current;
    if (refresh) {
      try { await trpcMutation('auth.logout', { refreshToken: refresh }); } catch { /* ignore */ }
    }
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  const updateProfile = useCallback(async (fields: { name?: string; postalCode?: string; city?: string }) => {
    const { data, error } = await trpcMutation<{ success: boolean }>(
      'auth.updateProfile', fields, { authenticated: true }
    );
    if (error || !data) return { ok: false, error: error || 'Erreur inconnue' };
    setUser(prev => (prev ? { ...prev, ...fields } : prev));
    return { ok: true };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isLoggedIn: !!user,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur d’un <AuthProvider>');
  return ctx;
}
