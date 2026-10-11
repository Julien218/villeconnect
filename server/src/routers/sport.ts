// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Rubrique Sport : clubs et installations sportives de la commune.
// Les clubs proposent leur fiche (en attente), un administrateur de ville la publie en un clic.
// Les événements sportifs restent dans l'agenda (catégorie « Sport ») et sont repris ici.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { cityAdminProcedure, protectedProcedure, publicProcedure, router } from '../trpc';
import { db } from '../db';
import { checkRateLimit } from '../lib/auth';

const MAX_SPORTS = 8;

/** « football, Futsal ,football » -> ['Football', 'Futsal'] (majuscule initiale, sans doublon). */
export function normalizeSports(raw: string[] | string): string[] {
  const list = Array.isArray(raw) ? raw : raw.split(',');
  const seen = new Map<string, string>();
  for (const item of list) {
    const clean = item.trim().replace(/\s+/g, ' ');
    if (clean.length < 2 || clean.length > 40) continue;
    const label = clean.charAt(0).toLocaleUpperCase('fr-BE') + clean.slice(1);
    const key = label.toLocaleLowerCase('fr-BE');
    if (!seen.has(key)) seen.set(key, label);
  }
  return [...seen.values()].slice(0, MAX_SPORTS);
}

const placeInput = z.object({
  postalCode: z.string().trim().regex(/^\d{4}$/),
  kind: z.enum(['club', 'installation']),
  name: z.string().trim().min(2).max(160),
  sports: z.array(z.string().trim().min(2).max(40)).min(1).max(MAX_SPORTS),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(255).optional(),
  audience: z.string().trim().max(120).optional(),
  schedule: z.string().trim().max(255).optional(),
  priceInfo: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(190).optional().or(z.literal('')),
  website: z.string().trim().url().max(500).refine(url => /^https?:\/\//i.test(url), 'Adresse web invalide.')
    .optional().or(z.literal('')),
});

type PlaceInput = z.infer<typeof placeInput>;

function placeValues(input: PlaceInput): any[] {
  const sports = normalizeSports(input.sports);
  if (sports.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Indiquez au moins une discipline.' });
  return [
    input.postalCode, input.kind, input.name, sports.join(','), input.description || null,
    input.address || null, input.audience || null, input.schedule || null, input.priceInfo || null,
    input.phone || null, input.email || null, input.website || null,
  ];
}

const PUBLIC_COLUMNS = `id, kind, name, sports, description, address, audience, schedule,
  price_info AS priceInfo, phone, email, website`;

function toPlace(row: any) {
  return { ...row, id: Number(row.id), sports: normalizeSports(String(row.sports || '')) };
}

export const sportRouter = router({
  // Vue publique : disciplines, clubs, installations et prochains événements sportifs.
  overview: publicProcedure
    .input(z.object({ postalCode: z.string().trim().min(3).max(12).default('7370') }))
    .query(async ({ input }) => {
      const [placeRows] = await db.execute(
        `SELECT ${PUBLIC_COLUMNS} FROM sport_places
         WHERE postal_code = ? AND status = 'published'
         ORDER BY name ASC LIMIT 300`,
        [input.postalCode]
      ) as any[];
      const places = (placeRows as any[]).map(toPlace);

      const [eventRows] = await db.execute(
        `SELECT id, title, dateStart, timeLabel, location, isFree, price, organizer
         FROM events
         WHERE postalCode = ? AND status = 'approved' AND category = 'Sport' AND dateStart >= NOW()
         ORDER BY dateStart ASC LIMIT 10`,
        [input.postalCode]
      ) as any[];

      const counts = new Map<string, number>();
      for (const place of places) {
        for (const sport of place.sports) counts.set(sport, (counts.get(sport) || 0) + 1);
      }
      const disciplines = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
        .map(([name, count]) => ({ name, count }));

      return { disciplines, places, events: eventRows };
    }),

  // Un club ou un gestionnaire propose sa fiche : elle reste en attente de validation.
  submit: protectedProcedure
    .input(placeInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.authType !== 'access' || !ctx.user.email_verified) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Connectez-vous et vérifiez votre email pour proposer une fiche.' });
      }
      if (!checkRateLimit(`sport-submit:${ctx.user.id}`, 5, 24 * 60 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de propositions aujourd’hui. Réessayez demain.' });
      }
      const [result] = await db.execute(
        `INSERT INTO sport_places (postal_code, kind, name, sports, description, address, audience,
                                   schedule, price_info, phone, email, website, status, submitted_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [...placeValues(input), ctx.user.id]
      ) as any[];
      return { id: Number((result as any).insertId), status: 'pending' as const };
    }),

  adminPending: cityAdminProcedure
    .input(z.object({ postalCode: z.string().trim().min(3).max(12).default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT ${PUBLIC_COLUMNS}, created_at AS createdAt FROM sport_places
         WHERE postal_code = ? AND status = 'pending' ORDER BY id ASC LIMIT 100`,
        [input.postalCode]
      ) as any[];
      return (rows as any[]).map(toPlace);
    }),

  adminSetStatus: cityAdminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(['published', 'rejected', 'archived']) }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.execute(
        'UPDATE sport_places SET status = ?, reviewed_by_user_id = ? WHERE id = ?',
        [input.status, ctx.user.id, input.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fiche introuvable.' });
      }
      return { success: true };
    }),

  // Saisie directe par l'administration (fiche publiée immédiatement), ou correction d'une fiche.
  adminUpsert: cityAdminProcedure
    .input(placeInput.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const values = placeValues(input);
      if (input.id) {
        const [result] = await db.execute(
          `UPDATE sport_places SET postal_code = ?, kind = ?, name = ?, sports = ?, description = ?,
                  address = ?, audience = ?, schedule = ?, price_info = ?, phone = ?, email = ?, website = ?,
                  reviewed_by_user_id = ?
           WHERE id = ?`,
          [...values, ctx.user.id, input.id]
        ) as any[];
        if (Number((result as any).affectedRows) !== 1) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fiche introuvable.' });
        }
        return { id: input.id };
      }
      const [result] = await db.execute(
        `INSERT INTO sport_places (postal_code, kind, name, sports, description, address, audience,
                                   schedule, price_info, phone, email, website, status,
                                   submitted_by_user_id, reviewed_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        [...values, ctx.user.id, ctx.user.id]
      ) as any[];
      return { id: Number((result as any).insertId) };
    }),
});
