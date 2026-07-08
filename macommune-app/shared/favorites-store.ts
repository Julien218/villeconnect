// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Persistance locale des favoris du Centre de Contrôle (glisser-déposer,
// ajout/suppression). Stocké par appareil via AsyncStorage — indépendant du moteur principal,
// chaque commune/utilisateur garde ses propres raccourcis (architecture modulaire).
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_MODULES, DEFAULT_FAVORITE_KEYS, FavoriteItem, HexVisualState, ModuleDef } from './control-center-types';

const STORAGE_KEY = 'villeconnect:control-center:favorites:v1';

// États de démo pour donner vie au Centre de Contrôle tant qu'aucun backend de
// notifications temps réel n'est branché sur ces modules précis.
const DEMO_STATES: Record<string, HexVisualState> = {
  signalement: 'urgent',
  agenda: 'new',
  guichet: 'syncing',
};

function withState(m: ModuleDef): FavoriteItem {
  return { ...m, state: DEMO_STATES[m.key] ?? 'normal' };
}

async function readKeys(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_FAVORITE_KEYS;
}

async function writeKeys(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {}
}

export function useFavorites() {
  const [keys, setKeys] = useState<string[]>(DEFAULT_FAVORITE_KEYS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await readKeys();
      setKeys(loaded);
      setReady(true);
    })();
  }, []);

  const favorites: FavoriteItem[] = keys
    .map(k => ALL_MODULES.find(m => m.key === k))
    .filter(Boolean)
    .map(m => withState(m as ModuleDef));

  const available: ModuleDef[] = ALL_MODULES.filter(m => !keys.includes(m.key));

  const persist = useCallback((next: string[]) => {
    setKeys(next);
    writeKeys(next);
  }, []);

  const addFavorite = useCallback((key: string) => {
    persist([...keys, key]);
  }, [keys, persist]);

  const removeFavorite = useCallback((key: string) => {
    persist(keys.filter(k => k !== key));
  }, [keys, persist]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    const next = [...keys];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persist(next);
  }, [keys, persist]);

  const resetToDefault = useCallback(() => persist(DEFAULT_FAVORITE_KEYS), [persist]);

  return { favorites, available, ready, addFavorite, removeFavorite, reorder, resetToDefault };
}
