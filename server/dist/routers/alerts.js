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
        const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 10)));
        const [rows] = await db_1.db.execute(`SELECT id, title, message, type, postalCode, city, startDate, endDate, isActive, createdAt
         FROM communal_alerts
         WHERE postalCode = ? AND isActive = 1
           AND (expiresAt IS NULL OR expiresAt > NOW())
         ORDER BY createdAt DESC
         LIMIT ${safeLimit}`, [input.postalCode]);
        return rows;
    }),
    count: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT COUNT(*) as total FROM communal_alerts WHERE postalCode = ? AND isActive = 1`, [input.postalCode]);
        return rows[0];
    }),
});
