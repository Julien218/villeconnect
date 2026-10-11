// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { cityAdminProcedure, protectedProcedure, publicProcedure, router } from '../trpc';
import { db } from '../db';

const EVENT_WINDOW_MS = 60 * 60 * 1000;
const EVENT_LIMIT = 5;
const eventBuckets = new Map<string, number[]>();

function enforceEventRateLimit(ip = 'unknown') {
  const now = Date.now();
  const recent = (eventBuckets.get(ip) || []).filter(ts => now - ts < EVENT_WINDOW_MS);
  if (recent.length >= EVENT_LIMIT) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de demandes. Réessayez plus tard.' });
  }
  recent.push(now);
  eventBuckets.set(ip, recent);
}

export const eventsRouter = router({
  list: publicProcedure
    .input(z.object({
      postalCode: z.string().trim().min(3).max(12).default('7370'),
      limit: z.number().int().min(1).max(100).default(20),
      category: z.string().trim().max(60).optional(),
    }))
    .query(async ({ input }) => {
      let sql = `SELECT id, title, description, category, dateStart, dateEnd, timeLabel,
                        location, address, postalCode, city, imageUrl, isFree, price,
                        organizer, status, isRecurring
                 FROM events
                 WHERE postalCode = ? AND status = 'approved' AND dateStart >= NOW()`;
      const params: any[] = [input.postalCode];
      if (input.category) {
        sql += ' AND category = ?';
        params.push(input.category);
      }
      sql += ` ORDER BY dateStart ASC LIMIT ${input.limit}`;
      const [rows] = await db.execute(sql, params) as any[];
      return rows;
    }),

  // Les demandes en attente contiennent des coordonnées d'organisateur et ne sont
  // donc jamais accessibles publiquement.
  pending: cityAdminProcedure
    .input(z.object({ postalCode: z.string().trim().min(3).max(12).default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT id, title, description, category, dateStart, dateEnd, timeLabel,
                location, address, postalCode, city, imageUrl, isFree, price,
                organizer, organizerPhone, organizerEmail, status, isRecurring, createdAt
         FROM events
         WHERE postalCode = ? AND status = 'pending'
         ORDER BY createdAt DESC LIMIT 50`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  submit: publicProcedure
    .input(z.object({
      title: z.string().trim().min(3).max(190),
      description: z.string().trim().min(10).max(5000),
      dateStart: z.string().datetime(),
      location: z.string().trim().min(2).max(190),
      address: z.string().trim().max(255).optional(),
      category: z.enum(['Culture', 'Sport', 'Marché', 'Jeunesse', 'Environnement', 'Communal', 'Autre']).default('Autre'),
      postalCode: z.string().trim().min(3).max(12),
      city: z.string().trim().max(120).optional(),
      organizer: z.string().trim().min(2).max(190),
      organizerEmail: z.string().trim().email().max(190),
      organizerPhone: z.string().trim().max(40).optional(),
      isFree: z.boolean().default(true),
      price: z.number().min(0).max(100000).default(0),
      privacyConsent: z.literal(true),
      contactFax: z.string().max(200).optional().default(''),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.contactFax.trim()) {
        return { success: true, reference: 'PENDING' };
      }
      enforceEventRateLimit(ctx.ip);

      const start = new Date(input.dateStart);
      if (start.getTime() < Date.now() - 5 * 60 * 1000) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La date de début doit être future.' });
      }
      if (!input.isFree && input.price <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Un prix est requis pour un événement payant.' });
      }

      const dateStart = start.toISOString().slice(0, 19).replace('T', ' ');
      const [result] = await db.execute(
        `INSERT INTO events (
           title, description, dateStart, location, address, category,
           postalCode, city, organizer, organizerEmail, organizerPhone,
           isFree, price, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          input.title, input.description, dateStart, input.location,
          input.address || '', input.category, input.postalCode,
          input.city || '', input.organizer, input.organizerEmail,
          input.organizerPhone || '', input.isFree ? 1 : 0,
          input.isFree ? 0 : input.price,
        ]
      ) as any[];
      const id = Number((result as any).insertId);
      return { success: true, id, reference: `VC-${new Date().getUTCFullYear()}-${String(id).padStart(5, '0')}` };
    }),

  // Publication par un organisateur connecté (ASBL, commune, commerce) rattaché à une fiche
  // `event_organizers`. Un organisateur « de confiance » publie sans modération ; les autres
  // restent en attente. L'email n'est jamais pris dans le formulaire : il vient du compte.
  submitAsOrganizer: protectedProcedure
    .input(z.object({
      title: z.string().trim().min(3).max(190),
      description: z.string().trim().min(10).max(5000),
      dateStart: z.string().datetime(),
      location: z.string().trim().min(2).max(190),
      address: z.string().trim().max(255).optional(),
      category: z.enum(['Culture', 'Sport', 'Marché', 'Jeunesse', 'Environnement', 'Communal', 'Autre']).default('Autre'),
      organizerPhone: z.string().trim().max(40).optional(),
      isFree: z.boolean().default(true),
      price: z.number().min(0).max(100000).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const [orgRows] = await db.execute(
        `SELECT o.name, o.postal_code, o.trusted, u.email
         FROM event_organizers o JOIN users u ON u.id = o.user_id
         WHERE o.user_id = ? AND o.is_active = 1 LIMIT 1`,
        [ctx.user.id]
      ) as any[];
      const organizer = (orgRows as any[])[0];
      if (!organizer) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Votre compte n’est pas rattaché à un organisateur. Contactez VilleConnect.',
        });
      }

      const start = new Date(input.dateStart);
      if (start.getTime() < Date.now() - 5 * 60 * 1000) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'La date de début doit être future.' });
      }
      if (!input.isFree && input.price <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Un prix est requis pour un événement payant.' });
      }

      // Publication directe uniquement si la fiche est de confiance ET l'email du compte est vérifié.
      const autoApprove = Boolean(organizer.trusted) && ctx.user.email_verified;
      const status = autoApprove ? 'approved' : 'pending';

      const dateStart = start.toISOString().slice(0, 19).replace('T', ' ');
      const [result] = await db.execute(
        `INSERT INTO events (
           title, description, dateStart, location, address, category,
           postalCode, city, organizer, organizerEmail, organizerPhone,
           isFree, price, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.title, input.description, dateStart, input.location,
          input.address || '', input.category, organizer.postal_code, '',
          organizer.name, organizer.email, input.organizerPhone || '',
          input.isFree ? 1 : 0, input.isFree ? 0 : input.price, status,
        ]
      ) as any[];
      const id = Number((result as any).insertId);
      return { success: true, id, status, published: autoApprove };
    }),

  approve: cityAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [result] = await db.execute(
        `UPDATE events SET status = 'approved' WHERE id = ? AND status = 'pending'`,
        [input.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement en attente introuvable.' });
      }
      return { success: true };
    }),

  reject: cityAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [result] = await db.execute(
        `UPDATE events SET status = 'rejected' WHERE id = ? AND status = 'pending'`,
        [input.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement en attente introuvable.' });
      }
      return { success: true };
    }),

  stats: publicProcedure
    .input(z.object({ postalCode: z.string().trim().min(3).max(12).default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) AS total,
                SUM(status = 'approved') AS approved,
                SUM(status = 'pending') AS pending
         FROM events WHERE postalCode = ?`,
        [input.postalCode]
      ) as any[];
      return (rows as any[])[0];
    }),
});
