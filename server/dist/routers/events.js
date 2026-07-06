"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
exports.eventsRouter = (0, trpc_1.router)({
    list: trpc_1.publicProcedure
        .input(zod_1.z.object({
        postalCode: zod_1.z.string().default('7370'),
        limit: zod_1.z.number().default(20),
        category: zod_1.z.string().optional(),
    }))
        .query(async ({ input }) => {
        const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
        let sql = `SELECT id, title, description, category, dateStart, dateEnd, timeLabel,
                        location, address, postalCode, city, imageUrl, isFree, price,
                        organizer, organizerPhone, organizerEmail, status, isRecurring
                 FROM events
                 WHERE postalCode = ? AND status = 'approved' AND dateStart >= NOW()`;
        const params = [input.postalCode];
        if (input.category) {
            sql += ' AND category = ?';
            params.push(input.category);
        }
        sql += ` ORDER BY dateStart ASC LIMIT ${safeLimit}`;
        const [rows] = await db_1.db.execute(sql, params);
        return rows;
    }),
    pending: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM events WHERE postalCode = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 50`, [input.postalCode]);
        return rows;
    }),
    submit: trpc_1.publicProcedure
        .input(zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        dateStart: zod_1.z.string(),
        location: zod_1.z.string(),
        address: zod_1.z.string().optional(),
        category: zod_1.z.enum(['Culture', 'Sport', 'Marché', 'Jeunesse', 'Environnement', 'Communal', 'Autre']).default('Autre'),
        postalCode: zod_1.z.string(),
        city: zod_1.z.string().optional(),
        organizer: zod_1.z.string(),
        organizerEmail: zod_1.z.string(),
        organizerPhone: zod_1.z.string().optional(),
        isFree: zod_1.z.boolean().default(true),
        price: zod_1.z.number().default(0),
    }))
        .mutation(async ({ input }) => {
        const [result] = await db_1.db.execute(`INSERT INTO events (title, description, dateStart, location, address, category,
          postalCode, city, organizer, organizerEmail, organizerPhone, isFree, price, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`, [input.title, input.description, input.dateStart, input.location,
            input.address || '', input.category, input.postalCode,
            input.city || '', input.organizer, input.organizerEmail,
            input.organizerPhone || '', input.isFree ? 1 : 0, input.price]);
        const ref = `VC-2026-${String(result.insertId).padStart(5, '0')}`;
        return { success: true, id: result.insertId, reference: ref };
    }),
    approve: trpc_1.publicProcedure
        .input(zod_1.z.object({ id: zod_1.z.number() }))
        .mutation(async ({ input }) => {
        await db_1.db.execute(`UPDATE events SET status='approved' WHERE id=?`, [input.id]);
        return { success: true };
    }),
    stats: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT
           COUNT(*) as total,
           SUM(status='approved') as approved,
           SUM(status='pending') as pending
         FROM events WHERE postalCode = ?`, [input.postalCode]);
        return rows[0];
    }),
});
