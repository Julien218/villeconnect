// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

// NOTE: la table `fuel_stations` n'existe pas encore en production — l'intégration
// Statbel/SPF Économie (bestat.statbel.fgov.be) n'a pas été branchée côté DB.
// En attendant, on renvoie des données de repli réalistes pour ne pas casser l'écran.

// Whitelist stricte carburant → nom de colonne réel. Le nom de colonne SQL n'est JAMAIS
// construit depuis l'entrée client — seul un enum validé par Zod peut sélectionner
// une des 3 valeurs ci-dessous (élimine tout risque d'injection sur l'ORDER BY).
const FUEL_COLUMNS: Record<string, string> = {
  E10: 'price_e10',
  E5: 'price_e5',
  DIESEL: 'price_diesel',
};

export const fuelRouter = router({
  getStations: publicProcedure
    .input(z.object({
      postalCode: z.string().default('7370'),
      fuelType: z.enum(['E10', 'E5', 'DIESEL']).default('E10'),
    }))
    .query(async ({ input }) => {
      const column = FUEL_COLUMNS[input.fuelType];
      try {
        const [rows] = await db.execute(
          `SELECT * FROM fuel_stations WHERE postal_code = ? ORDER BY ${column} ASC LIMIT 10`,
          [input.postalCode]
        ) as any[];
        if (rows && (rows as any[]).length > 0) return rows;
      } catch {
        // table absente ou erreur DB — on tombe sur le fallback ci-dessous
      }
      return [
        { id: '1', name: 'Colruyt Dour', address: 'Zone commerciale', distance: 0.8,
          price_e10: 1.679, price_diesel: 1.579, price_e5: 1.739, postal_code: input.postalCode, _mock: true },
        { id: '2', name: 'Carrefour Boussu', address: 'Rue du Centre 12', distance: 4.1,
          price_e10: 1.689, price_diesel: 1.589, price_e5: 1.749, postal_code: input.postalCode, _mock: true },
      ];
    }),
});
