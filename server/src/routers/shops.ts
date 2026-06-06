// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const shopsRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370'), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT s.*, GROUP_CONCAT(sp.name SEPARATOR ',') as product_names
         FROM shops s
         LEFT JOIN shop_products sp ON sp.shop_id = s.id
         WHERE s.postal_code = ?
         GROUP BY s.id
         ORDER BY s.rating DESC
         LIMIT ?`,
        [input.postalCode, input.limit]
      ) as any[];
      return rows;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
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
        `SELECT * FROM shops WHERE postal_code = ? AND (name LIKE ? OR category LIKE ?) LIMIT 20`,
        [input.postalCode, `%${input.q}%`, `%${input.q}%`]
      ) as any[];
      return rows;
    }),
});
