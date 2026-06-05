/**
 * CivicLoop tRPC Router
 * © 2026 VilleConnect / Ma Commune — JS-Innov.IA
 * Sprint 3 — Wallet Civique, Missions, Marketplace
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { db } from './db';
import { randomUUID } from 'crypto';

export const civicloopRouter = router({

  // ─── WALLET ───────────────────────────────────────────────

  /** Récupérer ou créer le wallet de l'utilisateur connecté */
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Chercher wallet existant
    const [existing] = await db.execute(
      'SELECT * FROM civic_wallets WHERE user_id = ?',
      [userId]
    ) as any[];

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Créer un nouveau wallet (bonus de bienvenue 50 crédits)
    await db.execute(
      `INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
       VALUES (?, 50, 50, 50)`,
      [userId]
    );

    // Enregistrer la transaction de bienvenue
    await db.execute(
      `INSERT INTO civic_transactions (user_id, type, amount, label)
       VALUES (?, 'bonus', 50, '🎉 Bonus de bienvenue — Ma Commune')`,
      [userId]
    );

    const [created] = await db.execute(
      'SELECT * FROM civic_wallets WHERE user_id = ?',
      [userId]
    ) as any[];
    return created[0];
  }),

  /** Historique des transactions */
  getTransactions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM civic_transactions WHERE user_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [ctx.user.id, input.limit]
      ) as any[];
      return rows;
    }),

  // ─── MISSIONS ─────────────────────────────────────────────

  /** Lister les missions actives pour un code postal */
  getMissions: publicProcedure
    .input(z.object({ postalCode: z.string() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM missions
         WHERE postal_code = ? AND is_active = 1
         ORDER BY reward_amount DESC`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  /** Vérifier si une mission est déjà complétée par l'utilisateur */
  getMissionStatus: protectedProcedure
    .input(z.object({ postalCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const [missions] = await db.execute(
        `SELECT m.*, 
          CASE WHEN mc.id IS NOT NULL THEN 1 ELSE 0 END as completed
         FROM missions m
         LEFT JOIN mission_completions mc 
           ON mc.mission_id = m.id AND mc.user_id = ?
         WHERE m.postal_code = ? AND m.is_active = 1
         ORDER BY m.reward_amount DESC`,
        [ctx.user.id, input.postalCode]
      ) as any[];
      return missions;
    }),

  /** Compléter une mission (validation auto) */
  completeMission: protectedProcedure
    .input(z.object({ missionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Vérifier que la mission existe et est active
      const [missionRows] = await db.execute(
        'SELECT * FROM missions WHERE id = ? AND is_active = 1',
        [input.missionId]
      ) as any[];

      if (!missionRows || missionRows.length === 0) {
        throw new Error('Mission introuvable ou inactive');
      }
      const mission = missionRows[0];

      // Vérifier déjà complétée
      const [existing] = await db.execute(
        'SELECT id FROM mission_completions WHERE mission_id = ? AND user_id = ?',
        [input.missionId, userId]
      ) as any[];

      if (existing && existing.length > 0) {
        throw new Error('Mission déjà complétée');
      }

      // Vérifier quota max
      if (mission.max_completions && mission.completions_count >= mission.max_completions) {
        throw new Error('Quota de completions atteint');
      }

      // Enregistrer la complétion
      await db.execute(
        'INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)',
        [input.missionId, userId]
      );

      // Incrémenter compteur mission
      await db.execute(
        'UPDATE missions SET completions_count = completions_count + 1 WHERE id = ?',
        [input.missionId]
      );

      // Créditer le wallet
      await db.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label, mission_id)
         VALUES (?, 'earned', ?, ?, ?)`,
        [userId, mission.reward_amount, `${mission.icon} ${mission.title}`, input.missionId]
      );

      await db.execute(
        `UPDATE civic_wallets 
         SET available_balance = available_balance + ?,
             total_earned = total_earned + ?
         WHERE user_id = ?`,
        [mission.reward_amount, mission.reward_amount, userId]
      );

      // Mise à jour trust score (+1 par mission)
      await db.execute(
        `UPDATE civic_wallets 
         SET trust_score = LEAST(100, trust_score + 1)
         WHERE user_id = ?`,
        [userId]
      );

      return {
        ok: true,
        earned: mission.reward_amount,
        mission: mission.title,
        message: `+${mission.reward_amount} CivicCredits gagnés !`
      };
    }),

  // ─── MARKETPLACE ──────────────────────────────────────────

  /** Lister les récompenses disponibles */
  getRewards: publicProcedure
    .input(z.object({ postalCode: z.string() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT r.*, s.name as shop_name
         FROM rewards r
         LEFT JOIN shops s ON s.id = r.shop_id
         WHERE r.postal_code = ? AND r.is_active = 1
         ORDER BY r.cost_credits ASC`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  /** Réclamer une récompense */
  claimReward: protectedProcedure
    .input(z.object({ rewardId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Vérifier la récompense
      const [rewardRows] = await db.execute(
        'SELECT * FROM rewards WHERE id = ? AND is_active = 1',
        [input.rewardId]
      ) as any[];

      if (!rewardRows || rewardRows.length === 0) {
        throw new Error('Récompense introuvable');
      }
      const reward = rewardRows[0];

      // Vérifier stock
      if (reward.stock !== null && reward.claimed_count >= reward.stock) {
        throw new Error('Stock épuisé');
      }

      // Vérifier solde
      const [walletRows] = await db.execute(
        'SELECT available_balance FROM civic_wallets WHERE user_id = ?',
        [userId]
      ) as any[];

      if (!walletRows || walletRows.length === 0 || walletRows[0].available_balance < reward.cost_credits) {
        throw new Error('Solde insuffisant');
      }

      // Générer QR code unique
      const qrCode = `VC-${randomUUID().toUpperCase().replace(/-/g, '').slice(0, 12)}`;

      // Créer la réclamation
      await db.execute(
        `INSERT INTO reward_claims (reward_id, user_id, qr_code, status)
         VALUES (?, ?, ?, 'pending')`,
        [input.rewardId, userId, qrCode]
      );

      // Débiter le wallet
      await db.execute(
        `UPDATE civic_wallets 
         SET available_balance = available_balance - ?,
             total_spent = total_spent + ?
         WHERE user_id = ?`,
        [reward.cost_credits, reward.cost_credits, userId]
      );

      // Transaction
      await db.execute(
        `INSERT INTO civic_transactions (user_id, type, amount, label, reward_id)
         VALUES (?, 'spent', ?, ?, ?)`,
        [userId, reward.cost_credits, `${reward.icon} ${reward.title}`, input.rewardId]
      );

      // Incrémenter compteur récompense
      await db.execute(
        'UPDATE rewards SET claimed_count = claimed_count + 1 WHERE id = ?',
        [input.rewardId]
      );

      return {
        ok: true,
        qrCode,
        reward: reward.title,
        cost: reward.cost_credits,
        message: 'Récompense réclamée ! Présentez le QR code au commerçant.'
      };
    }),

  /** Mes réclamations (pour afficher les QR codes) */
  getMyClaims: protectedProcedure.query(async ({ ctx }) => {
    const [rows] = await db.execute(
      `SELECT rc.*, r.title, r.icon, r.description, s.name as shop_name
       FROM reward_claims rc
       JOIN rewards r ON r.id = rc.reward_id
       LEFT JOIN shops s ON s.id = r.shop_id
       WHERE rc.user_id = ?
       ORDER BY rc.claimed_at DESC`,
      [ctx.user.id]
    ) as any[];
    return rows;
  }),
});
