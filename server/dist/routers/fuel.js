"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fuelRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
exports.fuelRouter = (0, trpc_1.router)({
    getStations: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370'), fuelType: zod_1.z.string().default('E10') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM fuel_stations WHERE postal_code = ? ORDER BY price_${input.fuelType.toLowerCase()} ASC LIMIT 10`, [input.postalCode]);
        // fallback si table vide — retourner mock
        if (!rows || rows.length === 0) {
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
