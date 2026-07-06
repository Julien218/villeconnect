"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
// Résout (ou crée) l'utilisateur numérique lié à un identifiant client (openId),
// car civic_wallets.user_id / civic_transactions.user_id sont des clés INT (FK vers users.id)
// alors que le client mobile/web ne connaît qu'un identifiant anonyme (UUID) stocké localement.
async function getOrCreateUserId(openId, postalCode) {
    const [rows] = await db_1.db.execute('SELECT id FROM users WHERE openId = ?', [openId]);
    const arr = rows;
    if (arr.length > 0)
        return arr[0].id;
    await db_1.db.execute(`INSERT INTO users (openId, loginMethod, role, postalCode) VALUES (?, 'anonymous', 'user', ?)`, [openId, postalCode || null]);
    const [created] = await db_1.db.execute('SELECT id FROM users WHERE openId = ?', [openId]);
    return created[0].id;
}
exports.walletRouter = (0, trpc_1.router)({
    getWallet: trpc_1.publicProcedure
        .input(zod_1.z.object({ openId: zod_1.z.string(), postalCode: zod_1.z.string().optional() }))
        .query(async ({ input }) => {
        const userId = await getOrCreateUserId(input.openId, input.postalCode);
        const [rows] = await db_1.db.execute('SELECT * FROM civic_wallets WHERE user_id = ?', [userId]);
        const arr = rows;
        if (arr.length > 0)
            return arr[0];
        await db_1.db.execute(`INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
         VALUES (?, 50, 50, 42)`, [userId]);
        await db_1.db.execute(`INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'bonus', 50, '👋 Bonus bienvenue — Inscription DourConnect')`, [userId]);
        const [created] = await db_1.db.execute('SELECT * FROM civic_wallets WHERE user_id = ?', [userId]);
        return created[0];
    }),
    getTransactions: trpc_1.publicProcedure
        .input(zod_1.z.object({ openId: zod_1.z.string(), limit: zod_1.z.number().default(20) }))
        .query(async ({ input }) => {
        const userId = await getOrCreateUserId(input.openId);
        const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
        const [rows] = await db_1.db.execute(`SELECT * FROM civic_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`, [userId]);
        return rows;
    }),
    getMissions: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT id, title, description, reward_amount AS credits, category, icon,
                validation_type, is_active, max_completions, completions_count
         FROM missions WHERE postal_code = ? AND is_active = 1 ORDER BY reward_amount DESC`, [input.postalCode]);
        return rows;
    }),
    getRewards: trpc_1.publicProcedure
        .input(zod_1.z.object({ postalCode: zod_1.z.string().default('7370') }))
        .query(async ({ input }) => {
        const [rows] = await db_1.db.execute(`SELECT r.*, s.name AS merchant_name FROM rewards r
         LEFT JOIN shops s ON s.id = r.shop_id
         WHERE r.postal_code = ? AND r.is_active = 1
         ORDER BY r.cost_credits ASC`, [input.postalCode]);
        return rows;
    }),
    completeMission: trpc_1.publicProcedure
        .input(zod_1.z.object({ openId: zod_1.z.string(), missionId: zod_1.z.number(), credits: zod_1.z.number() }))
        .mutation(async ({ input }) => {
        const userId = await getOrCreateUserId(input.openId);
        await db_1.db.execute(`INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)`, [input.missionId, userId]);
        await db_1.db.execute(`UPDATE civic_wallets SET available_balance = available_balance + ?,
         total_earned = total_earned + ? WHERE user_id = ?`, [input.credits, input.credits, userId]);
        await db_1.db.execute(`INSERT INTO civic_transactions (user_id, type, amount, label, mission_id)
         VALUES (?, 'earned', ?, 'Mission validée', ?)`, [userId, input.credits, input.missionId]);
        return { success: true };
    }),
});
