// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const alertsRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370'), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM communal_alerts WHERE postal_code = ? AND is_active = 1
         ORDER BY created_at DESC LIMIT ?`,
        [input.postalCode, input.limit]
      ) as any[];
      return rows;
    }),
});
