// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Contrôle d'une adresse de flux avant téléchargement : https uniquement, jamais une adresse interne.
import dns from 'node:dns/promises';
import net from 'node:net';

export function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
    return lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
  }
  return true;
}

/** Retourne l'URL si elle est acceptable, sinon lève une erreur lisible. */
export function parseFeedUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error('Adresse de flux invalide.'); }
  if (url.protocol !== 'https:') throw new Error('Le flux doit utiliser https.');
  if (url.username || url.password) throw new Error('Adresse avec identifiants refusée.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Adresse interne refusée.');
  }
  if (net.isIP(host) && isPrivateAddress(host)) throw new Error('Adresse interne refusée.');
  return url;
}

/** Vérifie en plus que le nom de domaine ne pointe pas vers une adresse interne. */
export async function assertPublicHost(url: URL): Promise<void> {
  const records = await dns.lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some(record => isPrivateAddress(record.address))) {
    throw new Error('Adresse interne refusée.');
  }
}
