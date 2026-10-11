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
  /** Commission calculée sur les produits seulement, jamais sur les frais de livraison. */
  platformFeeCents: number;
  deliveryFeeCents: number;
  /** Ce que paie le client : la commission est prélevée sur la part du commerçant, jamais ajoutée. */
  totalCents: number;
}

export function priceOrder(lines: PricedLine[], percent: number, deliveryFeeCents = 0): OrderTotals {
  if (!Number.isInteger(deliveryFeeCents) || deliveryFeeCents < 0) throw new Error('Frais de livraison invalides');
  if (lines.length === 0) throw new Error('Commande vide');
  let subtotal = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents <= 0) throw new Error('Prix invalide');
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Quantité invalide');
    subtotal += line.unitPriceCents * line.quantity;
  }
  const fee = computePlatformFeeCents(subtotal, percent);
  return {
    subtotalCents: subtotal,
    platformFeeCents: fee,
    deliveryFeeCents,
    totalCents: subtotal + deliveryFeeCents,
  };
}

export interface DeliverySettings {
  enabled: boolean;
  feeCents: number;
  freeFromCents: number | null;
  postalCodes: string[];
}

/** « 7370, 7380 ;7387 » -> ['7370', '7380', '7387'] (4 chiffres belges, sans doublon). */
export function parsePostalCodes(raw: string | null | undefined): string[] {
  const codes = (raw || '').split(/[\s,;]+/).map(code => code.trim()).filter(code => /^\d{4}$/.test(code));
  return [...new Set(codes)];
}

/** Frais de livraison dus pour un sous-total produits ; null si l'adresse n'est pas livrée. */
export function deliveryFeeFor(settings: DeliverySettings, subtotalCents: number, postalCode: string): number | null {
  if (!settings.enabled || !settings.postalCodes.includes(postalCode.trim())) return null;
  if (settings.freeFromCents !== null && subtotalCents >= settings.freeFromCents) return 0;
  return settings.feeCents;
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
