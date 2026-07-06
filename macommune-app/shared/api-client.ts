// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Client tRPC minimal (fetch-based) pour l'app Ma Commune / VilleConnect OS.
// Centralise l'URL du backend Railway et un identifiant citoyen anonyme persistant.
import AsyncStorage from '@react-native-async-storage/async-storage';

function clean(v?: string) {
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export const API_URL =
  clean(process.env.EXPO_PUBLIC_API_URL) || 'https://villeconnect-production.up.railway.app';

const TRPC_BASE = `${API_URL}/api/trpc`;

/** Appelle une query tRPC (GET) publique. Retourne { data, error }. */
export async function trpcQuery<T = any>(path: string, input: Record<string, any>): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = `${TRPC_BASE}/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok || json?.error) {
      return { data: null, error: json?.error?.message || `HTTP ${res.status}` };
    }
    return { data: json?.result?.data ?? null, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'network_error' };
  }
}

/** Appelle une mutation tRPC (POST). */
export async function trpcMutation<T = any>(path: string, input: Record<string, any>): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${TRPC_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || json?.error) {
      return { data: null, error: json?.error?.message || `HTTP ${res.status}` };
    }
    return { data: json?.result?.data ?? null, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'network_error' };
  }
}

const OPEN_ID_KEY = 'macommune_open_id';

/** Identifiant citoyen anonyme persistant (device-based), utilisé pour le CivicWallet. */
export async function getOpenId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(OPEN_ID_KEY);
    if (existing) return existing;
    const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(OPEN_ID_KEY, id);
    return id;
  } catch {
    // fallback si AsyncStorage indisponible (ex: SSR) — ID de session non persistant
    return `guest-session-${Math.random().toString(36).slice(2, 10)}`;
  }
}
