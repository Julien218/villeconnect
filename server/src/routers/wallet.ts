// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '../db';
import { getOrCreateUserId } from '../lib/users';

export const walletRouter = router({
  getWallet: publicProcedure
    .input(z.object({ openId: z.string(), postalCode: z.string().optional() }))
    .query(async ({ input }) => {
      const { id: userId } = await getOrCreateUserId(input.openId, input.postalCode);
      const [rows] = await db.execute(
        'SELECT * FROM civic_wallets WHERE user_id = ?',
        [userId]
      ) as any[];
      const arr = rows as any[];
      if (arr.length > 0) return arr[0];
      await db.execute(
        `INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
         VALUES (?, 50, 50, 42)`,
        [userId]
      );
      await db.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'bonus', 50, '👋 Bonus bienvenue — Inscription DourConnect')`,
        [userId]
      );
      const [created] = await db.execute(
        'SELECT * FROM civic_wallets WHERE user_id = ?', [userId]
      ) as any[];
      return (created as any[])[0];
    }),

  getTransactions: publicProcedure
    .input(z.object({ openId: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const { id: userId } = await getOrCreateUserId(input.openId);
      const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
      const [rows] = await db.execute(
        `SELECT * FROM civic_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
        [userId]
      ) as any[];
      return rows;
    }),

  getMissions: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT id, title, description, reward_amount AS credits, category, icon,
                validation_type, is_active, max_completions, completions_count
         FROM missions WHERE postal_code = ? AND is_active = 1 ORDER BY reward_amount DESC`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  getRewards: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT r.*, s.name AS merchant_name FROM rewards r
         LEFT JOIN shops s ON s.id = r.shop_id
         WHERE r.postal_code = ? AND r.is_active = 1
         ORDER BY r.cost_credits ASC`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  // Protégée : nécessite un token émis par auth.deviceLogin. Le montant crédité vient
  // TOUJOURS de la mission en base (reward_amount), jamais d'un champ envoyé par le
  // client. Anti double-validation via contrainte UNIQUE(mission_id, user_id) + verrou
  // transactionnel (FOR UPDATE) pour éviter toute course/double-clic.
  completeMission: protectedProcedure
    .input(z.object({ missionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id;
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const [missionRows] = await conn.execute(
          `SELECT id, reward_amount, is_active, max_completions, completions_count
           FROM missions WHERE id = ? FOR UPDATE`,
          [input.missionId]
        ) as any[];
        const mission = (missionRows as any[])[0];

        if (!mission || !mission.is_active) {
          await conn.rollback();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Mission introuvable ou inactive' });
        }
        if (mission.max_completions && mission.completions_count >= mission.max_completions) {
          await conn.rollback();
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Mission déjà complétée au maximum de participants' });
        }

        const [already] = await conn.execute(
          'SELECT id FROM mission_completions WHERE mission_id = ? AND user_id = ?',
          [input.missionId, userId]
        ) as any[];
        if ((already as any[]).length > 0) {
          await conn.rollback();
          throw new TRPCError({ code: 'CONFLICT', message: 'Mission déjà validée pour ce compte' });
        }

        const rewardAmount = Number(mission.reward_amount);

        await conn.execute(
          'INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)',
          [input.missionId, userId]
        );
        await conn.execute(
          'UPDATE missions SET completions_count = completions_count + 1 WHERE id = ?',
          [input.missionId]
        );
        await conn.execute(
          `UPDATE civic_wallets SET available_balance = available_balance + ?,
           total_earned = total_earned + ? WHERE user_id = ?`,
          [rewardAmount, rewardAmount, userId]
        );
        await conn.execute(
          `INSERT INTO civic_transactions (user_id, type, amount, label, mission_id)
           VALUES (?, 'earned', ?, 'Mission validée', ?)`,
          [userId, rewardAmount, input.missionId]
        );

        await conn.commit();
        console.log(`[wallet] mission ${input.missionId} validée — user ${userId} — +${rewardAmount} CL`);
        return { success: true, credited: rewardAmount };
      } catch (e) {
        try { await conn.rollback(); } catch { /* déjà rollback */ }
        throw e;
      } finally {
        conn.release();
      }
    }),
});
