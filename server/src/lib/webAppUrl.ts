// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Adresse publique de l'application web, utilisée dans les e-mails et les retours de paiement.
// Une valeur mal collée dans WEB_APP_URL (autre chose qu'une adresse https) casserait tous les liens :
// on la refuse et on revient à l'adresse officielle, en le signalant une fois dans les journaux.

export const DEFAULT_WEB_APP_URL = 'https://app.villeconnectos.com';
let warned = false;

export function isValidWebAppUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function webAppUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = (env.WEB_APP_URL || '').trim();
  if (isValidWebAppUrl(raw)) return raw.replace(/\/+$/, '');
  if (raw && !warned) {
    warned = true;
    console.error(JSON.stringify({ level: 'warn', scope: 'config', message: 'WEB_APP_URL invalide : adresse officielle utilisée à la place', fallback: DEFAULT_WEB_APP_URL }));
  }
  return DEFAULT_WEB_APP_URL;
}
