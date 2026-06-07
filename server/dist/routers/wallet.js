"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
exports.walletRouter = (0, trpc_1.router)({
    getWallet: trpc_1.publicProcedure
        .input(zod_1.z.object({ userId: zod_1.z.string() }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute('SELECT * FROM civic_wallets WHERE user_id = ?', [input.userId]);
        const arr = rows;
        if (arr.length > 0)
            return arr[0];
        await db_1.db.execute(`INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
         VALUES (?, 50, 50, 42)`, [input.userId]);
        await db_1.db.execute(`INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'bonus', 50, '👋 Bonus bienvenue — Inscription DourConnect')`, [input.userId]);
        const [created] = await db_1.db.execute('SELECT * FROM civic_wallets WHERE user_id = ?', [input.userId]);
        return created[0];
    }),
    getTransactions: trpc_1.publicProcedure
        .input(zod_1.z.object({ userId: zod_1.z.string(), limit: zod_1.z.number().default(20) }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM civic_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, [input.userId, input.limit]);
        return rows;
    }),
    getMissions: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT * FROM civic_missions WHERE postal_code = ? AND is_active = 1 ORDER BY credits DESC`, [input.postalCode]);
        return rows;
    }),
    getRewards: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT mi.*, s.name as merchant_name FROM marketplace_items mi
         LEFT JOIN shops s ON s.id = mi.merchant_id
         WHERE mi.postal_code = ? AND mi.is_active = 1
         ORDER BY mi.cost_credits ASC`, [input.postalCode]);
        return rows;
    }),
    completeMission: trpc_1.publicProcedure
        .input(zod_1.z.object({ userId: zod_1.z.string(), missionId: zod_1.z.string(), credits: zod_1.z.number() }))
        .mutation(async ({ input }) => {
        await db_1.db.execute(`UPDATE civic_wallets SET available_balance = available_balance + ?,
         total_earned = total_earned + ? WHERE user_id = ?`, [input.credits, input.credits, input.userId]);
        await db_1.db.execute(`INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'mission', ?, 'Mission validée')`, [input.userId, input.credits]);
        return { success: true };
    }),
});
