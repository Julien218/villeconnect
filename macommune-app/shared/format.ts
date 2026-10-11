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

export function orderStatusLabel(status: string): string {
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
