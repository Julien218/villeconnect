"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const trpc_1 = require("../trpc");
const db_1 = require("../db");
const users_1 = require("../lib/users");
exports.walletRouter = (0, trpc_1.router)({
    getWallet: trpc_1.publicProcedure
        .input(zod_1.z.object({ openId: zod_1.z.string(), postalCode: zod_1.z.string().optional() }))
        .query(async ({ input }) => {
        const { id: userId } = await (0, users_1.getOrCreateUserId)(input.openId, input.postalCode);
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
        const { id: userId } = await (0, users_1.getOrCreateUserId)(input.openId);
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
    // Protégée : nécessite un token émis par auth.deviceLogin. Le montant crédité vient
    // TOUJOURS de la mission en base (reward_amount), jamais d'un champ envoyé par le
    // client. Anti double-validation via contrainte UNIQUE(mission_id, user_id) + verrou
    // transactionnel (FOR UPDATE) pour éviter toute course/double-clic.
    //
    // IMPORTANT : ne suppose PAS que le wallet existe déjà (getWallet peut ne jamais
    // avoir été appelé avant). Le wallet est créé de façon atomique (INSERT ... ON
    // DUPLICATE KEY, protégé par la contrainte UNIQUE(user_id) déjà présente en DB) à
    // l'intérieur de la même transaction, AVANT le crédit — aucun crédit ne peut donc
    // être perdu silencieusement sur un wallet inexistant.
    completeMission: trpc_1.protectedProcedure
        .input(zod_1.z.object({ missionId: zod_1.z.number() }))
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const conn = await db_1.db.getConnection();
        try {
            await conn.beginTransaction();
            const [missionRows] = await conn.execute(`SELECT id, reward_amount, is_active, max_completions, completions_count
           FROM missions WHERE id = ? FOR UPDATE`, [input.missionId]);
            const mission = missionRows[0];
            if (!mission || !mission.is_active) {
                await conn.rollback();
                throw new server_1.TRPCError({ code: 'NOT_FOUND', message: 'Mission introuvable ou inactive' });
            }
            if (mission.max_completions && mission.completions_count >= mission.max_completions) {
                await conn.rollback();
                throw new server_1.TRPCError({ code: 'PRECONDITION_FAILED', message: 'Mission déjà complétée au maximum de participants' });
            }
            const [already] = await conn.execute('SELECT id FROM mission_completions WHERE mission_id = ? AND user_id = ?', [input.missionId, userId]);
            if (already.length > 0) {
                await conn.rollback();
                throw new server_1.TRPCError({ code: 'CONFLICT', message: 'Mission déjà validée pour ce compte' });
            }
            const rewardAmount = Number(mission.reward_amount);
            // Crée le wallet s'il n'existe pas encore (baseline à 0 — le bonus de bienvenue
            // reste géré exclusivement par getWallet). Idempotent grâce à la contrainte
            // UNIQUE(user_id) déjà présente sur civic_wallets.
            await conn.execute(`INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
           VALUES (?, 0, 0, 42)
           ON DUPLICATE KEY UPDATE user_id = user_id`, [userId]);
            await conn.execute('INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)', [input.missionId, userId]);
            await conn.execute('UPDATE missions SET completions_count = completions_count + 1 WHERE id = ?', [input.missionId]);
            const [updateResult] = await conn.execute(`UPDATE civic_wallets SET available_balance = available_balance + ?,
           total_earned = total_earned + ? WHERE user_id = ?`, [rewardAmount, rewardAmount, userId]);
            if (updateResult.affectedRows !== 1) {
                // Filet de sécurité : ne devrait jamais se produire vu l'INSERT juste au-dessus,
                // mais on refuse catégoriquement de committer un crédit non appliqué.
                throw new Error('wallet_update_failed');
            }
            await conn.execute(`INSERT INTO civic_transactions (user_id, type, amount, label, mission_id)
           VALUES (?, 'earned', ?, 'Mission validée', ?)`, [userId, rewardAmount, input.missionId]);
            await conn.commit();
            console.log(`[wallet] mission ${input.missionId} validée — user ${userId} — +${rewardAmount} CL`);
            return { success: true, credited: rewardAmount };
        }
        catch (e) {
            try {
                await conn.rollback();
            }
            catch { /* déjà rollback */ }
            throw e;
        }
        finally {
            conn.release();
        }
    }),
});
