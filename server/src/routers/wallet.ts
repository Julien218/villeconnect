// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

// Résout (ou crée) l'utilisateur numérique lié à un identifiant client (openId),
// car civic_wallets.user_id / civic_transactions.user_id sont des clés INT (FK vers users.id)
// alors que le client mobile/web ne connaît qu'un identifiant anonyme (UUID) stocké localement.
async function getOrCreateUserId(openId: string, postalCode?: string): Promise<number> {
  const [rows] = await db.execute('SELECT id FROM users WHERE openId = ?', [openId]) as any[];
  const arr = rows as any[];
  if (arr.length > 0) return arr[0].id;
  await db.execute(
    `INSERT INTO users (openId, loginMethod, role, postalCode) VALUES (?, 'anonymous', 'user', ?)`,
    [openId, postalCode || null]
  );
  const [created] = await db.execute('SELECT id FROM users WHERE openId = ?', [openId]) as any[];
  return (created as any[])[0].id;
}

export const walletRouter = router({
  getWallet: publicProcedure
    .input(z.object({ openId: z.string(), postalCode: z.string().optional() }))
    .query(async ({ input }) => {
      const userId = await getOrCreateUserId(input.openId, input.postalCode);
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
      const userId = await getOrCreateUserId(input.openId);
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

  completeMission: publicProcedure
    .input(z.object({ openId: z.string(), missionId: z.number(), credits: z.number() }))
    .mutation(async ({ input }) => {
      const userId = await getOrCreateUserId(input.openId);
      await db.execute(
        `INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)`,
        [input.missionId, userId]
      );
      await db.execute(
        `UPDATE civic_wallets SET available_balance = available_balance + ?,
         total_earned = total_earned + ? WHERE user_id = ?`,
        [input.credits, input.credits, userId]
      );
      await db.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label, mission_id)
         VALUES (?, 'earned', ?, 'Mission validée', ?)`,
        [userId, input.credits, input.missionId]
      );
      return { success: true };
    }),
});
