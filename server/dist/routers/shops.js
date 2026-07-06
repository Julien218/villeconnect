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
        const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
        const [rows] = await db_1.db.execute(`SELECT s.id, s.name, s.category, s.description, s.address, s.postalCode, s.city,
                s.phone, s.email, s.website, s.imageUrl, s.rating, s.reviewCount,
                s.hasPromotion, s.promotionText, s.isActive, s.hours
         FROM shops s
         WHERE s.postalCode = ? AND s.isActive = 1
         ORDER BY s.rating DESC
         LIMIT ${safeLimit}`, [input.postalCode]);
        return rows;
    }),
    getById: trpc_1.publicProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute('SELECT * FROM shops WHERE id = ?', [input.id]);
        return rows[0] || null;
    }),
    search: trpc_1.publicProcedure
        .input(zod_1.z.object({ q: zod_1.z.string(), postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM shops WHERE postalCode = ? AND (name LIKE ? OR category LIKE ?) AND isActive = 1 LIMIT 20`, [input.postalCode, `%${input.q}%`, `%${input.q}%`]);
        return rows;
    }),
    stats: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT COUNT(*) as total, SUM(hasPromotion) as withPromo FROM shops WHERE postalCode = ? AND isActive = 1`, [input.postalCode]);
        return rows[0];
    }),
});
