// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Règles d'argent de VilleConnect. Tout est calculé en CENTIMES entiers, côté serveur uniquement :
// le client n'envoie jamais un prix, seulement des identifiants de produits et des quantités.
import { randomInt } from 'crypto';

export const CURRENCY = 'eur';
const DEFAULT_FEE_PERCENT = 5;
const DEFAULT_MIN_ORDER_CENTS = 1000; // 10 €, car Stripe prélève des frais fixes par paiement.
export const MAX_ORDER_CENTS = 500_000; // 5 000 € par commande en ligne.

function numberFromEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** Commission de la plateforme en pourcentage (5 par défaut, bornée entre 0 et 30). */
export function platformFeePercent(env: Record<string, string | undefined> = process.env): number {
  return numberFromEnv(env.PLATFORM_FEE_PERCENT, DEFAULT_FEE_PERCENT, 0, 30);
}

/** Montant minimum d'une commande en centimes. */
export function minOrderCents(env: Record<string, string | undefined> = process.env): number {
  return Math.floor(numberFromEnv(env.MIN_ORDER_CENTS, DEFAULT_MIN_ORDER_CENTS, 0, MAX_ORDER_CENTS));
}

/** Commission en centimes, arrondie au centime le plus proche. */
export function computePlatformFeeCents(subtotalCents: number, percent: number): number {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new Error('Montant invalide');
  }
  return Math.round((subtotalCents * percent) / 100);
}

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
}

export interface OrderTotals {
  subtotalCents: number;
  platformFeeCents: number;
  /** Ce que paie le client : la commission est prélevée sur la part du commerçant, jamais ajoutée. */
  totalCents: number;
}

export function priceOrder(lines: PricedLine[], percent: number): OrderTotals {
  if (lines.length === 0) throw new Error('Commande vide');
  let subtotal = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents <= 0) throw new Error('Prix invalide');
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Quantité invalide');
    subtotal += line.unitPriceCents * line.quantity;
  }
  const fee = computePlatformFeeCents(subtotal, percent);
  return { subtotalCents: subtotal, platformFeeCents: fee, totalCents: subtotal };
}

// Sans I, L, O, 0, 1 pour éviter les confusions à la lecture d'un code à voix haute.
const PICKUP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Code de retrait à 6 caractères, tiré avec un générateur cryptographique. */
export function generatePickupCode(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += PICKUP_ALPHABET[randomInt(PICKUP_ALPHABET.length)];
  return code;
}

export function normalizePickupCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}
