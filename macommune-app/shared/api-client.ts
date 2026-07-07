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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Appelle une query tRPC (GET) publique. Retourne { data, error }.
 * Réessaie une fois après un court délai en cas d'échec réseau (cold-start Railway
 * possible après une période d'inactivité du service).
 */
export async function trpcQuery<T = any>(path: string, input: Record<string, any>): Promise<{ data: T | null; error: string | null }> {
  const attempt = async () => {
    const url = `${TRPC_BASE}/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const json = await res.json();
    if (!res.ok || json?.error) {
      return { data: null, error: json?.error?.message || `HTTP ${res.status}` };
    }
    return { data: json?.result?.data ?? null, error: null };
  };

  try {
    const first = await attempt();
    if (first.data !== null) return first;
    // Un seul retry après un court délai (cold-start backend)
    await sleep(900);
    return await attempt();
  } catch (e: any) {
    try {
      await sleep(900);
      return await attempt();
    } catch (e2: any) {
      return { data: null, error: e2?.message || e?.message || 'network_error' };
    }
  }
}

/**
 * Appelle une mutation tRPC (POST). Pas de retry automatique (évite les doublons).
 * Si `authenticated` est vrai, attache le token d'identité du device (voir getDeviceToken)
 * en en-tête Authorization — requis pour les routes protégées côté serveur (ex: wallet.completeMission).
 */
export async function trpcMutation<T = any>(
  path: string,
  input: Record<string, any>,
  options?: { authenticated?: boolean }
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options?.authenticated) {
      const token = await getDeviceToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${TRPC_BASE}/${path}`, {
      method: 'POST',
      headers,
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
const DEVICE_TOKEN_KEY = 'macommune_device_token';

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

/**
 * Récupère (ou obtient auprès du serveur) le token signé prouvant l'identité anonyme
 * du device — nécessaire pour appeler les routes protégées (ex: valider une mission).
 * Mis en cache localement ; redemandé automatiquement s'il est absent ou expiré.
 */
export async function getDeviceToken(): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    if (cached) return cached;
  } catch { /* ignore */ }

  try {
    const openId = await getOpenId();
    const res = await fetch(`${TRPC_BASE}/auth.deviceLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openId }),
    });
    const json = await res.json();
    const token = json?.result?.data?.token;
    if (!token) return null;
    try { await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token); } catch { /* ignore */ }
    return token;
  } catch {
    return null;
  }
}
