// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, publicProcedure, router } from '../trpc';
import { db } from '../db';

const FUEL_COLUMNS = {
  E10: 'price_e10',
  E5: 'price_e5',
  DIESEL: 'price_diesel',
} as const;

const priceSchema = z.number().positive().max(4).nullable().optional();
const optionalUrl = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().url().max(1000).optional()
);

export const fuelRouter = router({
  getStations: publicProcedure
    .input(z.object({
      postalCode: z.string().trim().min(3).max(12).default('7370'),
      fuelType: z.enum(['E10', 'E5', 'DIESEL']).default('E10'),
      limit: z.number().int().min(1).max(25).default(10),
      latitude: z.number().finite().min(-90).max(90).optional(),
      longitude: z.number().finite().min(-180).max(180).optional(),
      radiusKm: z.number().int().min(1).max(50).default(10),
    }).refine(input => (input.latitude === undefined) === (input.longitude === undefined), {
      message: 'Latitude et longitude doivent être fournies ensemble.',
    }))
    .query(async ({ input }) => {
      const column = FUEL_COLUMNS[input.fuelType];
      const nearby = input.latitude !== undefined && input.longitude !== undefined;
      // Haversine distance in km; filter before sorting/limiting so the cheapest
      // eligible station is not lost to a nearest-stations or postal-code cutoff.
      const distance = nearby ? `6371 * 2 * ASIN(SQRT(LEAST(1,
        POWER(SIN(RADIANS(latitude - ?) / 2), 2) +
        COS(RADIANS(?)) * COS(RADIANS(latitude)) *
        POWER(SIN(RADIANS(longitude - ?) / 2), 2)
      )))` : 'NULL';
      try {
        const [rows] = await db.execute(
          `SELECT id, external_id AS externalId, name, address,
                  postal_code AS postalCode, city_name AS city,
                  latitude, longitude,
                  price_e10 AS priceE10, price_e5 AS priceE5,
                  price_diesel AS priceDiesel,
                  source_name AS sourceName, source_url AS sourceUrl,
                  source_updated_at AS sourceUpdatedAt,
                  ${distance} AS distanceKm
           FROM fuel_stations
           WHERE ${nearby ? 'latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180' : 'postal_code = ?'}
             AND is_active = 1 AND ${column} IS NOT NULL
           ${nearby ? 'HAVING distanceKm <= ?' : ''}
           ORDER BY ${column} ASC, distanceKm ASC, source_updated_at DESC
           LIMIT ${input.limit}`,
          nearby
            ? [input.latitude!, input.latitude!, input.longitude!, input.radiusKm]
            : [input.postalCode]
        ) as any[];

        const items = (rows as any[]).map(row => ({
          ...row,
          id: String(row.id),
          distanceKm: row.distanceKm == null ? null : Number(row.distanceKm),
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
          priceE10: row.priceE10 == null ? null : Number(row.priceE10),
          priceE5: row.priceE5 == null ? null : Number(row.priceE5),
          priceDiesel: row.priceDiesel == null ? null : Number(row.priceDiesel),
        }));

        return {
          items,
          status: items.length > 0 ? 'available' as const : 'empty' as const,
          sourceUpdatedAt: items[0]?.sourceUpdatedAt || null,
        };
      } catch (error: any) {
        // La fonctionnalité reste explicitement indisponible tant que la migration ou
        // l'alimentation de données n'est pas opérationnelle. Aucun prix n'est inventé.
        console.error(JSON.stringify({
          level: 'error',
          scope: 'fuel.getStations',
          code: error?.code || 'DB_ERROR',
        }));
        return { items: [], status: 'unavailable' as const, sourceUpdatedAt: null };
      }
    }),

  upsertStation: adminProcedure
    .input(z.object({
      externalId: z.string().trim().min(1).max(190),
      name: z.string().trim().min(2).max(190),
      address: z.string().trim().min(3).max(255),
      postalCode: z.string().trim().min(3).max(12),
      city: z.string().trim().max(120).optional(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      priceE10: priceSchema,
      priceE5: priceSchema,
      priceDiesel: priceSchema,
      sourceName: z.string().trim().min(2).max(120),
      sourceUrl: optionalUrl,
      sourceUpdatedAt: z.string().datetime(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (input.priceE10 == null && input.priceE5 == null && input.priceDiesel == null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Au moins un prix carburant est requis.',
        });
      }

      const sourceDate = new Date(input.sourceUpdatedAt);
      if (sourceDate.getTime() > Date.now() + 5 * 60 * 1000) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La date de source ne peut pas être dans le futur.',
        });
      }

      await db.execute(
        `INSERT INTO fuel_stations (
           external_id, name, address, postal_code, city_name,
           latitude, longitude, price_e10, price_e5, price_diesel,
           source_name, source_url, source_updated_at, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), address = VALUES(address), postal_code = VALUES(postal_code),
           city_name = VALUES(city_name), latitude = VALUES(latitude), longitude = VALUES(longitude),
           price_e10 = VALUES(price_e10), price_e5 = VALUES(price_e5),
           price_diesel = VALUES(price_diesel), source_url = VALUES(source_url),
           source_updated_at = VALUES(source_updated_at), is_active = VALUES(is_active),
           updated_at = CURRENT_TIMESTAMP`,
        [
          input.externalId, input.name, input.address, input.postalCode, input.city || null,
          input.latitude ?? null, input.longitude ?? null,
          input.priceE10 ?? null, input.priceE5 ?? null, input.priceDiesel ?? null,
          input.sourceName, input.sourceUrl || null,
          sourceDate.toISOString().slice(0, 19).replace('T', ' '), input.isActive ? 1 : 0,
        ]
      );
      return { success: true };
    }),

  deactivateStation: adminProcedure
    .input(z.object({ id: z.string().regex(/^\d+$/) }))
    .mutation(async ({ input }) => {
      const [result] = await db.execute(
        'UPDATE fuel_stations SET is_active = 0 WHERE id = ?',
        [input.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Station introuvable' });
      }
      return { success: true };
    }),
});
