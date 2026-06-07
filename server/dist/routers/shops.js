"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopsRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
exports.shopsRouter = (0, trpc_1.router)({
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370'), limit: zod_1.z.number().default(20) }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT s.*, GROUP_CONCAT(sp.name SEPARATOR ',') as product_names
         FROM shops s
         LEFT JOIN shop_products sp ON sp.shop_id = s.id
         WHERE s.postal_code = ?
         GROUP BY s.id
         ORDER BY s.rating DESC
         LIMIT ?`, [input.postalCode, input.limit]);
        return rows;
    }),
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ id: zod_1.z.string() }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute('SELECT * FROM shops WHERE id = ?', [input.id]);
        return rows[0] || null;
    }),
    search: trpc_1.publicProcedure
        .input(zod_1.z.object({ q: zod_1.z.string(), postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM shops WHERE postal_code = ? AND (name LIKE ? OR category LIKE ?) LIMIT 20`, [input.postalCode, `%${input.q}%`, `%${input.q}%`]);
        return rows;
    }),
});
