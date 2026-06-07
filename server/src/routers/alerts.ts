// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const alertsRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370'), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT id, title, message, type, postalCode, city, startDate, endDate, isActive, createdAt
         FROM communal_alerts
         WHERE postalCode = ? AND isActive = 1
           AND (expiresAt IS NULL OR expiresAt > NOW())
         ORDER BY createdAt DESC
         LIMIT ?`,
        [input.postalCode, input.limit]
      ) as any[];
      return rows;
    }),

  count: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as total FROM communal_alerts WHERE postalCode = ? AND isActive = 1`,
        [input.postalCode]
      ) as any[];
      return (rows as any[])[0];
    }),
});
