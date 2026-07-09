// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Hook : statut commune + liens publics
// Usage : const { status, links, disclaimer, loading } = useCityStatus('7370');

import { useState, useEffect, useCallback } from 'react';
import { trpcQuery, trpcMutation } from './api-client';
import type { CityStatus, ServiceLink } from '@/components/CityStatusBanner';

interface CityStatusState {
  loading: boolean;
  error: string | null;
  found: boolean;
  cityId?: number;
  cityName?: string;
  status: CityStatus;
  citizenCount: number;
  links: ServiceLink[];
  disclaimer: string;
}

const DISCLAIMER_DEFAULT =
  "Ces liens publics sont proposés pour faciliter l'accès aux services. " +
  "Ils ne sont pas encore validés officiellement par la commune.";

export function useCityStatus(postalCode?: string): CityStatusState & {
  registerInterest: () => Promise<void>;
  refresh: () => void;
} {
  const [state, setState] = useState<CityStatusState>({
    loading: false,
    error: null,
    found: false,
    status: 'unknown',
    citizenCount: 0,
    links: [],
    disclaimer: DISCLAIMER_DEFAULT,
  });

  const load = useCallback(async () => {
    if (!postalCode) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const [statusRes, linksRes] = await Promise.all([
        trpcQuery<any>('city.getByPostalCode', { postal_code: postalCode }),
        trpcQuery<any>('city.getServiceLinks', { postal_code: postalCode }),
      ]);

      const cityData = statusRes.data ?? {};
      const linksData = linksRes.data ?? {};

      setState({
        loading: false,
        error: null,
        found: cityData.found ?? false,
        cityId: cityData.id,
        cityName: cityData.name,
        status: (cityData.status as CityStatus) ?? 'unknown',
        citizenCount: cityData.citizen_count ?? 0,
        links: linksData.links ?? [],
        disclaimer: linksData.disclaimer ?? DISCLAIMER_DEFAULT,
      });
    } catch (e: any) {
      setState(s => ({
        ...s,
        loading: false,
        error: e?.message ?? 'Erreur chargement statut commune',
      }));
    }
  }, [postalCode]);

  useEffect(() => { load(); }, [load]);

  const registerInterest = useCallback(async () => {
    if (!postalCode) return;
    try {
      await trpcMutation<any>('city.registerCityInterest', {
        postal_code: postalCode,
        request_type: 'invite_request',
      });
      await load();
    } catch (e: any) {
      console.warn('[CityStatus] registerInterest error:', e?.message);
    }
  }, [postalCode, load]);

  return { ...state, registerInterest, refresh: load };
}
