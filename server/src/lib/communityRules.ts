// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Règles pures du tableau d'annonces entre voisins (testables sans base de données).

export const KINDS = ['sell', 'give', 'lend', 'wanted', 'help'] as const;
export type Kind = (typeof KINDS)[number];

export const LISTING_TTL_DAYS = 30;
export const MAX_PRICE_CENTS = 1_000_000; // 10 000 €
export const REPORTS_TO_HIDE = 3;
export const TRUST_MIN_PUBLISHED = 2;

// Objets et services interdits (liste volontairement prudente, à compléter avec l'expérience).
const FORBIDDEN = [
  'arme', 'armes', 'pistolet', 'fusil', 'munition', 'munitions', 'explosif',
  'médicament', 'medicament', 'médicaments', 'medicaments', 'ordonnance',
  'drogue', 'cannabis', 'cocaïne', 'cocaine', 'stupéfiant', 'stupefiant',
  'contrefaçon', 'contrefacon', 'faux papiers', 'cigarette', 'cigarettes', 'alcool fort',
  'animal', 'animaux', 'chiot', 'chiots', 'chaton', 'chatons',
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Retourne le premier mot interdit trouvé (mot entier), sinon null. */
export function findForbiddenTerm(text: string): string | null {
  const words = new Set(normalize(text).split(/[^a-z0-9]+/).filter(Boolean));
  const joined = ` ${normalize(text).replace(/[^a-z0-9]+/g, ' ')} `;
  for (const term of FORBIDDEN) {
    const norm = normalize(term);
    if (norm.includes(' ') ? joined.includes(` ${norm} `) : words.has(norm)) return term;
  }
  return null;
}

/** Masque téléphones et emails dans un texte public : tout passe par la messagerie. */
export function redactContacts(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contact via la messagerie]')
    .replace(/(?:\+|00)?\d[\d .\-/]{7,}\d/g, '[contact via la messagerie]');
}

export interface ListingInput {
  kind: Kind;
  title: string;
  description: string;
  priceCents?: number | null;
  priceUnit?: 'fixed' | 'per_day' | null;
}

export interface CleanListing {
  kind: Kind;
  title: string;
  description: string;
  priceCents: number | null;
  priceUnit: 'fixed' | 'per_day' | null;
}

/** Valide et normalise une annonce. Lève une Error au message lisible si elle est refusée. */
export function cleanListing(input: ListingInput): CleanListing {
  const title = redactContacts(input.title.replace(/\s+/g, ' ').trim());
  const description = redactContacts(input.description.trim());
  if (title.length < 3 || title.length > 120) throw new Error('Le titre doit faire entre 3 et 120 caractères.');
  if (description.length < 10 || description.length > 2000) throw new Error('La description doit faire entre 10 et 2000 caractères.');

  const forbidden = findForbiddenTerm(`${title} ${description}`);
  if (forbidden) throw new Error(`Cette annonce semble concerner un objet ou service non autorisé (« ${forbidden} »).`);

  let priceCents: number | null = input.priceCents ?? null;
  let priceUnit: 'fixed' | 'per_day' | null = input.priceUnit ?? null;

  if (input.kind === 'give' || input.kind === 'help') {
    priceCents = null; priceUnit = null;
  } else if (input.kind === 'sell') {
    if (priceCents === null || priceCents <= 0) throw new Error('Indiquez un prix de vente.');
    priceUnit = 'fixed';
  } else if (input.kind === 'lend') {
    // Prêt gratuit si aucun prix ; sinon prix par jour.
    if (priceCents === null || priceCents === 0) { priceCents = null; priceUnit = null; }
    else priceUnit = 'per_day';
  } else if (input.kind === 'wanted') {
    if (priceCents === null || priceCents === 0) { priceCents = null; priceUnit = null; } else priceUnit = 'fixed';
  }
  if (priceCents !== null && (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > MAX_PRICE_CENTS)) {
    throw new Error('Prix invalide.');
  }
  return { kind: input.kind, title, description, priceCents, priceUnit };
}

/** Un auteur est « de confiance » après quelques annonces validées, sans retrait ni refus. */
export function isTrustedAuthor(stats: { published: number; removedOrRejected: number }): boolean {
  return stats.published >= TRUST_MIN_PUBLISHED && stats.removedOrRejected === 0;
}

export function listingExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + LISTING_TTL_DAYS * 24 * 3600 * 1000);
}

/** Nom affiché publiquement : prénom + initiale, jamais l'email. */
export function publicName(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Voisin';
  const first = parts[0].slice(0, 20);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

/** Nettoie un message de conversation. */
export function cleanMessage(body: string): string {
  const text = body.replace(/\r/g, '').trim();
  if (text.length < 1) throw new Error('Message vide.');
  if (text.length > 1000) throw new Error('Message trop long (1000 caractères maximum).');
  return text;
}
