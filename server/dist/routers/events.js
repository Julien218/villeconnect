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
        let sql = `SELECT * FROM events WHERE postal_code = ? AND status = 'approved' AND date >= CURDATE()`;
        const params = [input.postalCode];
        if (input.category) {
            sql += ' AND category = ?';
            params.push(input.category);
        }
        sql += ' ORDER BY date ASC LIMIT ?';
        params.push(input.limit);
        const [rows] = await db_1.db.execute(sql, params);
        return rows;
    }),
    pending: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM events WHERE postal_code = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 50`, [input.postalCode]);
        return rows;
    }),
    submit: trpc_1.publicProcedure
        .input(zod_1.z.object({
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        date: zod_1.z.string(),
        location: zod_1.z.string(),
        category: zod_1.z.string(),
        postal_code: zod_1.z.string(),
        organizer_name: zod_1.z.string(),
        organizer_email: zod_1.z.string(),
        price: zod_1.z.number().default(0),
    }))
        .mutation(async ({ input }) => {
        const ref = `VC-2026-${String(Date.now()).slice(-5)}`;
        await db_1.db.execute(`INSERT INTO events (title, description, date, location, category, postal_code,
          organizer_name, organizer_email, price, status, reference)
         VALUES (?,?,?,?,?,?,?,?,?,'pending',?)`, [input.title, input.description, input.date, input.location,
            input.category, input.postal_code, input.organizer_name,
            input.organizer_email, input.price, ref]);
        return { success: true, reference: ref };
    }),
    approve: trpc_1.publicProcedure
        .input(zod_1.z.object({ id: zod_1.z.string() }))
        .mutation(async ({ input }) => {
        await db_1.db.execute(`UPDATE events SET status='approved' WHERE id=?`, [input.id]);
        return { success: true };
    }),
});
