// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Formatage des montants et statuts de commande. Les montants circulent TOUJOURS en centimes.

export function formatEuros(cents: number): string {
  const value = Number.isFinite(cents) ? cents : 0;
  return `${(value / 100).toFixed(2).replace('.', ',')} €`;
}

/** Convertit « 4,50 » ou « 4.5 » en 450. Retourne null si la saisie n'est pas un montant valide. */
export function parseEuroToCents(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export type OrderStatus =
  | 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'collected' | 'cancelled';

const LABELS: Record<OrderStatus, string> = {
  pending_payment: 'En attente de paiement',
  paid: 'Payée',
  preparing: 'En préparation',
  ready: 'Prête à retirer',
  collected: 'Retirée',
  cancelled: 'Annulée',
};

const DELIVERY_LABELS: Partial<Record<OrderStatus, string>> = {
  ready: 'En cours de livraison',
  collected: 'Livrée',
};

export function orderStatusLabel(status: string, fulfillment?: string | null): string {
  if (fulfillment === 'delivery' && DELIVERY_LABELS[status as OrderStatus]) {
    return DELIVERY_LABELS[status as OrderStatus]!;
  }
  return LABELS[status as OrderStatus] || status;
}

/** Statuts après lesquels la commande évolue encore : l'écran se rafraîchit seul. */
export function isOrderInProgress(status: string): boolean {
  return ['pending_payment', 'paid', 'preparing', 'ready'].includes(status);
}

/** Convertit « JJ/MM/AAAA HH:MM » (heure locale de l'appareil) en date ISO UTC, ou null si invalide. */
export function parseDateTimeFr(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[:h](\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day &&
    date.getHours() === hour && date.getMinutes() === minute;
  return valid ? date.toISOString() : null;
}

export type ListingKind = 'sell' | 'give' | 'lend' | 'wanted' | 'help';

export const LISTING_KINDS: { key: ListingKind; label: string; icon: string; hint: string }[] = [
  { key: 'sell', label: 'Vendre', icon: 'pricetag-outline', hint: 'Un objet d’occasion à vendre' },
  { key: 'give', label: 'Donner', icon: 'gift-outline', hint: 'Un objet offert' },
  { key: 'lend', label: 'Prêter / louer', icon: 'hammer-outline', hint: 'Échelle, visseuse… gratuit ou par jour' },
  { key: 'wanted', label: 'Chercher', icon: 'search-outline', hint: 'Je cherche un objet' },
  { key: 'help', label: 'Entraide', icon: 'hand-left-outline', hint: 'Un coup de main entre voisins' },
];

export function listingKindLabel(kind: string): string {
  return LISTING_KINDS.find(item => item.key === kind)?.label ?? 'Annonce';
}

/** Prix affiché d'une annonce : « 25,00 € », « 5,00 € / jour », « Gratuit » ou « À discuter ». */
export function listingPriceLabel(kind: string, priceCents: number | null | undefined, priceUnit?: string | null): string {
  if (priceCents === null || priceCents === undefined) {
    return kind === 'give' || kind === 'lend' || kind === 'help' ? 'Gratuit' : 'À discuter';
  }
  return priceUnit === 'per_day' ? `${formatEuros(priceCents)} / jour` : formatEuros(priceCents);
}
