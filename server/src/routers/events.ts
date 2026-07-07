// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { db } from '../db';

export const eventsRouter = router({
  list: publicProcedure
    .input(z.object({
      postalCode: z.string().default('7370'),
      limit: z.number().default(20),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
      let sql = `SELECT id, title, description, category, dateStart, dateEnd, timeLabel,
                        location, address, postalCode, city, imageUrl, isFree, price,
                        organizer, organizerPhone, organizerEmail, status, isRecurring
                 FROM events
                 WHERE postalCode = ? AND status = 'approved' AND dateStart >= NOW()`;
      const params: any[] = [input.postalCode];
      if (input.category) { sql += ' AND category = ?'; params.push(input.category); }
      sql += ` ORDER BY dateStart ASC LIMIT ${safeLimit}`;
      const [rows] = await db.execute(sql, params) as any[];
      return rows;
    }),

  pending: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM events WHERE postalCode = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 50`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  submit: publicProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      dateStart: z.string(),
      location: z.string(),
      address: z.string().optional(),
      category: z.enum(['Culture','Sport','Marché','Jeunesse','Environnement','Communal','Autre']).default('Autre'),
      postalCode: z.string(),
      city: z.string().optional(),
      organizer: z.string(),
      organizerEmail: z.string(),
      organizerPhone: z.string().optional(),
      isFree: z.boolean().default(true),
      price: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const [result] = await db.execute(
        `INSERT INTO events (title, description, dateStart, location, address, category,
          postalCode, city, organizer, organizerEmail, organizerPhone, isFree, price, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`,
        [input.title, input.description, input.dateStart, input.location,
         input.address || '', input.category, input.postalCode,
         input.city || '', input.organizer, input.organizerEmail,
         input.organizerPhone || '', input.isFree ? 1 : 0, input.price]
      ) as any[];
      const ref = `VC-2026-${String((result as any).insertId).padStart(5,'0')}`;
      return { success: true, id: (result as any).insertId, reference: ref };
    }),

  // Réservée admin/commune (modération) — auparavant publique, n'importe qui pouvait
  // approuver un événement en connaissant juste son id.
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.execute(`UPDATE events SET status='approved' WHERE id=?`, [input.id]);
      console.log(`[events] event ${input.id} approuvé`);
      return { success: true };
    }),

  stats: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT
           COUNT(*) as total,
           SUM(status='approved') as approved,
           SUM(status='pending') as pending
         FROM events WHERE postalCode = ?`,
        [input.postalCode]
      ) as any[];
      return (rows as any[])[0];
    }),
});
