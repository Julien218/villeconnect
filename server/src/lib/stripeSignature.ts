// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Vérification de la signature des webhooks Stripe, sans dépendance externe.
// Format de l'en-tête : "t=<horodatage>,v1=<signature hex>[,v1=...]" ; la signature est
// HMAC-SHA256 de "<horodatage>.<corps brut>" avec le secret du webhook (whsec_...).
import { createHmac, timingSafeEqual } from 'crypto';

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export function verifyStripeSignature(
  rawBody: Buffer | string,
  header: string | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = WEBHOOK_TOLERANCE_SECONDS
): boolean {
  if (!header || !secret) return false;

  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === 't') timestamp = Number(value);
    else if (key === 'v1') signatures.push(value);
  }

  if (!Number.isInteger(timestamp) || timestamp <= 0 || signatures.length === 0) return false;
  // Protège contre le rejeu d'une ancienne requête interceptée.
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const payload = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(payload)
    .digest();

  return signatures.some(signature => {
    if (!/^[0-9a-f]+$/i.test(signature) || signature.length % 2 !== 0) return false;
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}
