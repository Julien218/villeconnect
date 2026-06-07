// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';

export const walletRouter = router({
  getWallet: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        'SELECT * FROM civic_wallets WHERE user_id = ?',
        [input.userId]
      ) as any[];
      const arr = rows as any[];
      if (arr.length > 0) return arr[0];
      await db.execute(
        `INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
         VALUES (?, 50, 50, 42)`,
        [input.userId]
      );
      await db.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'bonus', 50, '👋 Bonus bienvenue — Inscription DourConnect')`,
        [input.userId]
      );
      const [created] = await db.execute(
        'SELECT * FROM civic_wallets WHERE user_id = ?', [input.userId]
      ) as any[];
      return (created as any[])[0];
    }),

  getTransactions: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM civic_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [input.userId, input.limit]
      ) as any[];
      return rows;
    }),

  getMissions: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM civic_missions WHERE postal_code = ? AND is_active = 1 ORDER BY credits DESC`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  getRewards: publicProcedure
    .input(z.object({ postalCode: z.string().default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT mi.*, s.name as merchant_name FROM marketplace_items mi
         LEFT JOIN shops s ON s.id = mi.merchant_id
         WHERE mi.postal_code = ? AND mi.is_active = 1
         ORDER BY mi.cost_credits ASC`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  completeMission: publicProcedure
    .input(z.object({ userId: z.string(), missionId: z.string(), credits: z.number() }))
    .mutation(async ({ input }) => {
      await db.execute(
        `UPDATE civic_wallets SET available_balance = available_balance + ?,
         total_earned = total_earned + ? WHERE user_id = ?`,
        [input.credits, input.credits, input.userId]
      );
      await db.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'mission', ?, 'Mission validée')`,
        [input.userId, input.credits]
      );
      return { success: true };
    }),
});
