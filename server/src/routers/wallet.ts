// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '../db';
import { getOrCreateUserId } from '../lib/users';

/**
 * Crée le wallet et son bonus de bienvenue de façon atomique et idempotente.
 *
 * Deux requêtes concurrentes (double rendu React, refresh rapide, deux appareils)
 * ne doivent jamais créer deux bonus ni renvoyer une erreur de clé dupliquée.
 * La contrainte UNIQUE sur civic_wallets.user_id reste la source de vérité :
 * INSERT IGNORE indique si cette transaction a réellement créé le wallet.
 */
async function getOrCreateWalletWithWelcomeBonus(userId: number) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [insertResult] = await conn.execute(
      `INSERT IGNORE INTO civic_wallets
         (user_id, available_balance, total_earned, trust_score)
       VALUES (?, 50, 50, 42)`,
      [userId]
    ) as any[];

    const created = Number((insertResult as any).affectedRows || 0) === 1;

    if (created) {
      await conn.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label)
         VALUES (?, 'bonus', 50, '👋 Bonus bienvenue — Inscription DourConnect')`,
        [userId]
      );
    }

    const [rows] = await conn.execute(
      'SELECT * FROM civic_wallets WHERE user_id = ? FOR UPDATE',
      [userId]
    ) as any[];
    const wallet = (rows as any[])[0];

    if (!wallet) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible d’initialiser le portefeuille CivicLoop',
      });
    }

    await conn.commit();
    return wallet;
  } catch (error) {
    try { await conn.rollback(); } catch { /* transaction déjà terminée */ }
    throw error;
  } finally {
    conn.release();
  }
}

export const walletRouter = router({
  getWallet: publicProcedure
    .input(z.object({ openId: z.string(), postalCode: z.string().optional() }))
    .query(async ({ input }) => {
      const { id: userId } = await getOrCreateUserId(input.openId, input.postalCode);
      return getOrCreateWalletWithWelcomeBonus(userId);
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

  // --- Variantes AUTHENTIFIÉES ------------------------------------------------
  // Une fois connecté, le wallet doit TOUJOURS être lu via ctx.user.id (identité
  // du compte réel, extraite du token JWT côté serveur) — JAMAIS via un openId
  // fourni par le client. C'est ce qui garantit qu'un même compte voit le même
  // wallet sur tous ses appareils, sans dépendre d'un identifiant local qui
  // change d'un device à l'autre. Les endpoints publics ci-dessus restent
  // réservés au mode invité (jamais utilisés côté client une fois loggé).
  getMyWallet: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user!.id;
    return getOrCreateWalletWithWelcomeBonus(userId);
  }),

  getMyTransactions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id;
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
  //
  // IMPORTANT : ne suppose PAS que le wallet existe déjà (getWallet peut ne jamais
  // avoir été appelé avant). Le wallet est créé de façon atomique (INSERT ... ON
  // DUPLICATE KEY, protégé par la contrainte UNIQUE(user_id) déjà présente en DB) à
  // l'intérieur de la même transaction, AVANT le crédit — aucun crédit ne peut donc
  // être perdu silencieusement sur un wallet inexistant.
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

        // Crée le wallet s'il n'existe pas encore (baseline à 0 — le bonus de bienvenue
        // reste géré exclusivement par getWallet). Idempotent grâce à la contrainte
        // UNIQUE(user_id) déjà présente sur civic_wallets.
        await conn.execute(
          `INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
           VALUES (?, 0, 0, 42)
           ON DUPLICATE KEY UPDATE user_id = user_id`,
          [userId]
        );

        await conn.execute(
          'INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)',
          [input.missionId, userId]
        );
        await conn.execute(
          'UPDATE missions SET completions_count = completions_count + 1 WHERE id = ?',
          [input.missionId]
        );
        const [updateResult] = await conn.execute(
          `UPDATE civic_wallets SET available_balance = available_balance + ?,
           total_earned = total_earned + ? WHERE user_id = ?`,
          [rewardAmount, rewardAmount, userId]
        ) as any[];
        if ((updateResult as any).affectedRows !== 1) {
          // Filet de sécurité : ne devrait jamais se produire vu l'INSERT juste au-dessus,
          // mais on refuse catégoriquement de committer un crédit non appliqué.
          throw new Error('wallet_update_failed');
        }
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