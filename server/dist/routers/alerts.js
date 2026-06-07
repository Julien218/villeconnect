"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
exports.alertsRouter = (0, trpc_1.router)({
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370'), limit: zod_1.z.number().default(10) }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM communal_alerts WHERE postal_code = ? AND is_active = 1
         ORDER BY created_at DESC LIMIT ?`, [input.postalCode, input.limit]);
        return rows;
    }),
});
