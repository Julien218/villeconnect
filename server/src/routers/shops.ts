// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const shopsRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370'), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
      const [rows] = await db.execute(
        `SELECT s.id, s.name, s.category, s.description, s.address, s.postalCode, s.city,
                s.phone, s.email, s.website, s.imageUrl, s.rating, s.reviewCount,
                s.hasPromotion, s.promotionText, s.isActive, s.hours
         FROM shops s
         WHERE s.postalCode = ? AND s.isActive = 1
         ORDER BY s.rating DESC
         LIMIT ${safeLimit}`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        'SELECT * FROM shops WHERE id = ?',
        [input.id]
      ) as any[];
      return (rows as any[])[0] || null;
    }),

  search: publicProcedure
    .input(z.object({ q: z.string(), postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM shops WHERE postalCode = ? AND (name LIKE ? OR category LIKE ?) AND isActive = 1 LIMIT 20`,
        [input.postalCode, `%${input.q}%`, `%${input.q}%`]
      ) as any[];
      return rows;
    }),

  stats: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total, SUM(hasPromotion) as withPromo FROM shops WHERE postalCode = ? AND isActive = 1`,
        [input.postalCode]
      ) as any[];
      return (rows as any[])[0];
    }),
});
