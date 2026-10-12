// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Client tRPC minimal pour VilleConnect OS.
import AsyncStorage from '@react-native-async-storage/async-storage';

function clean(value?: string) {
  return value && value.trim().length > 0 ? value.trim().replace(/\/$/, '') : undefined;
}

const explicitApiUrl = clean(process.env.EXPO_PUBLIC_API_URL);
export const API_URL = explicitApiUrl ||
  (process.env.NODE_ENV === 'production'
    ? 'https://villeconnect-production.up.railway.app'
    : 'http://localhost:3000');

const TRPC_BASE = `${API_URL}/api/trpc`;
const REQUEST_TIMEOUT_MS = 12_000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const raw = await response.text();
    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      return {
        response,
        json: null,
        parseError: 'Réponse serveur invalide',
      };
    }
    return { response, json, parseError: null };
  } finally {
    clearTimeout(timer);
  }
}

function messageFromResponse(response: Response, json: any, parseError?: string | null) {
  return parseError ||
    json?.error?.json?.message ||
    json?.error?.message ||
    json?.message ||
    `HTTP ${response.status}`;
}

// Token de session utilisateur uniquement en mémoire.
let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getCurrentAccessToken() {
  return currentAccessToken;
}

/** Query tRPC publique ou authentifiée. Une seule nouvelle tentative est autorisée
 * pour les erreurs réseau, timeouts et erreurs serveur 5xx. */
export async function trpcQuery<T = any>(
  path: string,
  input: Record<string, any>,
  options?: { authenticated?: boolean }
): Promise<{ data: T | null; error: string | null }> {
  const attempt = async (): Promise<{
    data: T | null;
    error: string | null;
    retryable: boolean;
  }> => {
    const url = `${TRPC_BASE}/${path}?input=${encodeURIComponent(JSON.stringify(input))}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options?.authenticated && currentAccessToken) {
      headers.Authorization = `Bearer ${currentAccessToken}`;
    }

    try {
      const { response, json, parseError } = await fetchJson(url, { headers });
      if (!response.ok || json?.error || parseError) {
        return {
          data: null,
          error: messageFromResponse(response, json, parseError),
          retryable: response.status >= 500 || response.status === 408 || response.status === 429,
        };
      }
      return { data: json?.result?.data ?? null, error: null, retryable: false };
    } catch (error: any) {
      const timedOut = error?.name === 'AbortError';
      return {
        data: null,
        error: timedOut ? 'Délai de connexion dépassé' : 'Connexion au serveur impossible. Vérifiez votre connexion internet.',
        retryable: true,
      };
    }
  };

  const first = await attempt();
  if (!first.retryable) return { data: first.data, error: first.error };
  await sleep(800);
  const second = await attempt();
  return { data: second.data, error: second.error };
}

/** Mutation tRPC. Aucune nouvelle tentative automatique afin d’éviter les doublons. */
export async function trpcMutation<T = any>(
  path: string,
  input: Record<string, any>,
  options?: { authenticated?: boolean }
): Promise<{ data: T | null; error: string | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.authenticated) {
    if (currentAccessToken) {
      headers.Authorization = `Bearer ${currentAccessToken}`;
    } else {
      const token = await getDeviceToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const { response, json, parseError } = await fetchJson(`${TRPC_BASE}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    if (!response.ok || json?.error || parseError) {
      return { data: null, error: messageFromResponse(response, json, parseError) };
    }
    return { data: json?.result?.data ?? null, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: error?.name === 'AbortError'
        ? 'Délai de connexion dépassé'
        : 'Connexion au serveur impossible. Vérifiez votre connexion internet.',
    };
  }
}

const OPEN_ID_KEY = 'macommune_open_id';
const DEVICE_TOKEN_KEY = 'macommune_device_token';

/** Identifiant citoyen anonyme persistant utilisé avant connexion. */
export async function getOpenId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(OPEN_ID_KEY);
    if (existing) return existing;
    const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(OPEN_ID_KEY, id);
    return id;
  } catch {
    return `guest-session-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Obtient le token signé du device invité. */
export async function getDeviceToken(): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
    if (cached) return cached;
  } catch { /* stockage indisponible */ }

  try {
    const openId = await getOpenId();
    const { response, json } = await fetchJson(`${TRPC_BASE}/auth.deviceLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openId }),
    });
    if (!response.ok) return null;
    const token = json?.result?.data?.token;
    if (!token) return null;
    try {
      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
    } catch { /* stockage indisponible */ }
    return token;
  } catch {
    return null;
  }
}
