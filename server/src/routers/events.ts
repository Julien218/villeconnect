// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '../db';

export const eventsRouter = router({
  list: publicProcedure
    .input(z.object({
      postalCode: z.string().default('7370'),
      limit: z.number().default(20),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      let sql = `SELECT * FROM events WHERE postal_code = ? AND status = 'approved' AND date >= CURDATE()`;
      const params: any[] = [input.postalCode];
      if (input.category) { sql += ' AND category = ?'; params.push(input.category); }
      sql += ' ORDER BY date ASC LIMIT ?';
      params.push(input.limit);
      const [rows] = await db.execute(sql, params) as any[];
      return rows;
    }),

  pending: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM events WHERE postal_code = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 50`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  submit: publicProcedure
    .input(z.object({
      title: z.string(),
      description: z.string(),
      date: z.string(),
      location: z.string(),
      category: z.string(),
      postal_code: z.string(),
      organizer_name: z.string(),
      organizer_email: z.string(),
      price: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const ref = `VC-2026-${String(Date.now()).slice(-5)}`;
      await db.execute(
        `INSERT INTO events (title, description, date, location, category, postal_code,
          organizer_name, organizer_email, price, status, reference)
         VALUES (?,?,?,?,?,?,?,?,?,'pending',?)`,
        [input.title, input.description, input.date, input.location,
         input.category, input.postal_code, input.organizer_name,
         input.organizer_email, input.price, ref]
      );
      return { success: true, reference: ref };
    }),

  approve: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.execute(`UPDATE events SET status='approved' WHERE id=?`, [input.id]);
      return { success: true };
    }),
});
