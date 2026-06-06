// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const fuelRouter = router({
  getStations: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370'), fuelType: z.string().default('E10') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM fuel_stations WHERE postal_code = ? ORDER BY price_${input.fuelType.toLowerCase()} ASC LIMIT 10`,
        [input.postalCode]
      ) as any[];
      // fallback si table vide — retourner mock
      if (!rows || (rows as any[]).length === 0) {
        return [
          { id: '1', name: 'Colruyt Dour', address: 'Zone commerciale', distance: 0.8,
            price_e10: 1.679, price_diesel: 1.579, price_e5: 1.739, postal_code: input.postalCode },
          { id: '2', name: 'Carrefour Boussu', address: 'Rue du Centre 12', distance: 4.1,
            price_e10: 1.689, price_diesel: 1.589, price_e5: 1.749, postal_code: input.postalCode },
        ];
      }
      return rows;
    }),
});
