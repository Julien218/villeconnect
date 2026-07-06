// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Branding léger, sans dépendance externe — utilisé par tous les écrans.
// Le moteur complet multi-villes (villeconnect-civicloop/lib/city-branding.ts) sera
// branché ici plus tard ; pour l'instant l'app tourne sur l'instance Dour (7370).

export interface Branding {
  appName: string;      // "DourConnect" — instance locale
  platformName: string; // "VilleConnect OS" — moteur plateforme
  cityName: string;     // "Dour"
  postalCode: string;   // "7370"
}

const CITIES: Record<string, { cityName: string; appName: string }> = {
  '7370': { cityName: 'Dour', appName: 'DourConnect' },
};

export function getBranding(postalCode: string = '7370'): Branding {
  const city = CITIES[postalCode] ?? { cityName: 'Ma Commune', appName: 'VilleConnect' };
  return {
    appName: city.appName,
    platformName: 'VilleConnect OS',
    cityName: city.cityName,
    postalCode,
  };
}
