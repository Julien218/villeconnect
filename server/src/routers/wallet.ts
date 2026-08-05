// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, merchantProcedure } from '../trpc';
import { db } from '../db';
import { getOrCreateUserId } from '../lib/users';

const REDEMPTION_TTL_MS = 10 * 60 * 1000;

function getQrSecret(): string {
  const secret = process.env.WALLET_QR_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'La signature des QR CivicLoop n’est pas configurée',
    });
  }
  return secret;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function signTokenPayload(payload: string): string {
  return createHmac('sha256', getQrSecret()).update(payload).digest('base64url');
}

function buildRedemptionToken(id: number, nonce: string, expiresAt: Date | string): string {
  const expirySeconds = Math.floor(new Date(expiresAt).getTime() / 1000);
  const payload = `${id}.${nonce}.${expirySeconds}`;
  return `vc1.${payload}.${signTokenPayload(payload)}`;
}

function parseAndVerifyRedemptionToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'vc1') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR CivicLoop invalide' });
  }

  const id = Number(parts[1]);
  const nonce = parts[2];
  const expirySeconds = Number(parts[3]);
  const suppliedSignature = parts[4];

  if (!Number.isSafeInteger(id) || id <= 0 || !/^[a-f0-9]{32}$/.test(nonce) || !Number.isSafeInteger(expirySeconds)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR CivicLoop invalide' });
  }

  const payload = `${id}.${nonce}.${expirySeconds}`;
  const expectedSignature = signTokenPayload(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Signature QR invalide' });
  }

  return { id, nonce, expiresAt: new Date(expirySeconds * 1000) };
}

function toMysqlDate(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function assertRealAccount(ctx: { user: { authType: 'access' | 'device'; email_verified: boolean } }) {
  if (ctx.user.authType !== 'access') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Connectez-vous à votre compte pour utiliser une récompense' });
  }
  if (!ctx.user.email_verified) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Vérifiez votre adresse e-mail avant d’utiliser une récompense' });
  }
}

/** Crée le wallet et son bonus de bienvenue de façon atomique et idempotente. */
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
         VALUES (?, 'bonus', 50, '👋 Bonus bienvenue — Inscription VilleConnect')`,
        [userId]
      );
    }

    const [rows] = await conn.execute(
      'SELECT * FROM civic_wallets WHERE user_id = ? FOR UPDATE',
      [userId]
    ) as any[];
    const wallet = (rows as any[])[0];
    if (!wallet) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Impossible d’initialiser le portefeuille CivicLoop' });
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

async function refundPendingRedemption(conn: any, redemption: any, nextStatus: 'cancelled' | 'expired') {
  await conn.execute(
    `UPDATE civic_wallets
     SET available_balance = available_balance + ?,
         total_spent = GREATEST(0, total_spent - ?)
     WHERE user_id = ?`,
    [redemption.credits_spent, redemption.credits_spent, redemption.user_id]
  );
  await conn.execute(
    `INSERT INTO civic_transactions (user_id, type, amount, label)
     VALUES (?, 'earned', ?, ?)`,
    [redemption.user_id, redemption.credits_spent, `Remboursement — ${redemption.reward_title}`]
  );
  await conn.execute(
    `UPDATE reward_redemptions
     SET status = ?, cancelled_at = CASE WHEN ? = 'cancelled' THEN NOW() ELSE cancelled_at END
     WHERE id = ? AND status = 'pending'`,
    [nextStatus, nextStatus, redemption.id]
  );
}

function publicRedemption(row: any, includeToken = false) {
  const response: Record<string, unknown> = {
    id: Number(row.id),
    rewardId: Number(row.reward_id),
    shopId: row.shop_id == null ? null : Number(row.shop_id),
    rewardTitle: row.reward_title,
    creditsSpent: Number(row.credits_spent),
    status: row.status,
    expiresAt: new Date(row.expires_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).toISOString() : null,
  };

  if (includeToken && row.status === 'pending' && new Date(row.expires_at).getTime() > Date.now()) {
    response.token = buildRedemptionToken(Number(row.id), row.token_nonce, row.expires_at);
  }
  return response;
}

export const walletRouter = router({
  getWallet: publicProcedure
    .input(z.object({ openId: z.string().min(1).max(190), postalCode: z.string().optional() }))
    .query(async ({ input }) => {
      const { id: userId } = await getOrCreateUserId(input.openId, input.postalCode);
      return getOrCreateWalletWithWelcomeBonus(userId);
    }),

  getTransactions: publicProcedure
    .input(z.object({ openId: z.string().min(1).max(190), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const { id: userId } = await getOrCreateUserId(input.openId);
      const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
      const [rows] = await db.execute(
        `SELECT * FROM civic_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
        [userId]
      ) as any[];
      return rows;
    }),

  getMyWallet: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreateWalletWithWelcomeBonus(ctx.user.id);
  }),

  getMyTransactions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 20)));
      const [rows] = await db.execute(
        `SELECT * FROM civic_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
        [ctx.user.id]
      ) as any[];
      return rows;
    }),

  getMyTransactionPage: protectedProcedure
    .input(z.object({ limit: z.number().default(20), cursor: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(input.limit) || 20)));
      const params: number[] = [ctx.user.id];
      let cursorClause = '';
      if (input.cursor) {
        cursorClause = 'AND id < ?';
        params.push(input.cursor);
      }
      const [rows] = await db.execute(
        `SELECT * FROM civic_transactions
         WHERE user_id = ? ${cursorClause}
         ORDER BY id DESC LIMIT ${safeLimit + 1}`,
        params
      ) as any[];
      const items = rows as any[];
      const hasMore = items.length > safeLimit;
      const page = hasMore ? items.slice(0, safeLimit) : items;
      return { items: page, nextCursor: hasMore ? Number(page[page.length - 1].id) : null };
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

  completeMission: protectedProcedure
    .input(z.object({ missionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
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
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Mission introuvable ou inactive' });
        }
        if (mission.max_completions && mission.completions_count >= mission.max_completions) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Mission déjà complétée au maximum de participants' });
        }

        const [already] = await conn.execute(
          'SELECT id FROM mission_completions WHERE mission_id = ? AND user_id = ?',
          [input.missionId, userId]
        ) as any[];
        if ((already as any[]).length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Mission déjà validée pour ce compte' });
        }

        const rewardAmount = Number(mission.reward_amount);
        await conn.execute(
          `INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
           VALUES (?, 0, 0, 42) ON DUPLICATE KEY UPDATE user_id = user_id`,
          [userId]
        );
        await conn.execute('INSERT INTO mission_completions (mission_id, user_id) VALUES (?, ?)', [input.missionId, userId]);
        await conn.execute('UPDATE missions SET completions_count = completions_count + 1 WHERE id = ?', [input.missionId]);
        const [updateResult] = await conn.execute(
          `UPDATE civic_wallets SET available_balance = available_balance + ?,
           total_earned = total_earned + ? WHERE user_id = ?`,
          [rewardAmount, rewardAmount, userId]
        ) as any[];
        if ((updateResult as any).affectedRows !== 1) throw new Error('wallet_update_failed');
        await conn.execute(
          `INSERT INTO civic_transactions (user_id, type, amount, label, mission_id)
           VALUES (?, 'earned', ?, 'Mission validée', ?)`,
          [userId, rewardAmount, input.missionId]
        );
        await conn.commit();
        return { success: true, credited: rewardAmount };
      } catch (error) {
        try { await conn.rollback(); } catch { /* déjà rollback */ }
        throw error;
      } finally {
        conn.release();
      }
    }),

  reserveReward: protectedProcedure
    .input(z.object({
      rewardId: z.number().int().positive(),
      idempotencyKey: z.string().min(8).max(64).regex(/^[A-Za-z0-9._:-]+$/),
    }))
    .mutation(async ({ ctx, input }) => {
      assertRealAccount(ctx);
      await getOrCreateWalletWithWelcomeBonus(ctx.user.id);

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const [existingRows] = await conn.execute(
          `SELECT * FROM reward_redemptions
           WHERE user_id = ? AND idempotency_key = ? FOR UPDATE`,
          [ctx.user.id, input.idempotencyKey]
        ) as any[];
        const existing = (existingRows as any[])[0];
        if (existing) {
          await conn.commit();
          return publicRedemption(existing, true);
        }

        const [rewardRows] = await conn.execute(
          `SELECT id, title, cost_credits, shop_id, is_active
           FROM rewards WHERE id = ? FOR UPDATE`,
          [input.rewardId]
        ) as any[];
        const reward = (rewardRows as any[])[0];
        if (!reward || !reward.is_active) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Récompense introuvable ou inactive' });
        }

        const credits = Number(reward.cost_credits);
        if (!Number.isFinite(credits) || credits <= 0) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Coût de récompense invalide' });
        }

        const [walletRows] = await conn.execute(
          'SELECT available_balance FROM civic_wallets WHERE user_id = ? FOR UPDATE',
          [ctx.user.id]
        ) as any[];
        const wallet = (walletRows as any[])[0];
        if (!wallet || Number(wallet.available_balance) < credits) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Solde CivicLoop insuffisant' });
        }

        const [debitResult] = await conn.execute(
          `UPDATE civic_wallets
           SET available_balance = available_balance - ?, total_spent = total_spent + ?
           WHERE user_id = ? AND available_balance >= ?`,
          [credits, credits, ctx.user.id, credits]
        ) as any[];
        if (Number((debitResult as any).affectedRows || 0) !== 1) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Le solde a changé, veuillez réessayer' });
        }

        const nonce = randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + REDEMPTION_TTL_MS);
        const temporaryHash = sha256(`pending:${ctx.user.id}:${input.idempotencyKey}:${nonce}`);
        const [insertResult] = await conn.execute(
          `INSERT INTO reward_redemptions
             (user_id, reward_id, shop_id, reward_title, credits_spent, status,
              idempotency_key, token_nonce, token_hash, expires_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
          [
            ctx.user.id,
            reward.id,
            reward.shop_id ?? null,
            reward.title,
            credits,
            input.idempotencyKey,
            nonce,
            temporaryHash,
            toMysqlDate(expiresAt),
          ]
        ) as any[];
        const redemptionId = Number((insertResult as any).insertId);
        const token = buildRedemptionToken(redemptionId, nonce, expiresAt);
        const tokenHash = sha256(token);

        await conn.execute('UPDATE reward_redemptions SET token_hash = ? WHERE id = ?', [tokenHash, redemptionId]);
        await conn.execute(
          `INSERT INTO civic_transactions (user_id, type, amount, label)
           VALUES (?, 'spent', ?, ?)`,
          [ctx.user.id, credits, `Récompense réservée — ${reward.title}`]
        );

        const [createdRows] = await conn.execute('SELECT * FROM reward_redemptions WHERE id = ?', [redemptionId]) as any[];
        await conn.commit();
        return { ...publicRedemption((createdRows as any[])[0]), token };
      } catch (error) {
        try { await conn.rollback(); } catch { /* déjà rollback */ }
        throw error;
      } finally {
        conn.release();
      }
    }),

  getMyRedemptions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      assertRealAccount(ctx);
      const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(input.limit) || 20)));
      const [rows] = await db.execute(
        `SELECT * FROM reward_redemptions
         WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
        [ctx.user.id]
      ) as any[];
      return (rows as any[]).map((row) => publicRedemption(row, true));
    }),

  cancelMyRedemption: protectedProcedure
    .input(z.object({ redemptionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertRealAccount(ctx);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [rows] = await conn.execute(
          'SELECT * FROM reward_redemptions WHERE id = ? AND user_id = ? FOR UPDATE',
          [input.redemptionId, ctx.user.id]
        ) as any[];
        const redemption = (rows as any[])[0];
        if (!redemption) throw new TRPCError({ code: 'NOT_FOUND', message: 'Échange introuvable' });
        if (redemption.status === 'cancelled' || redemption.status === 'expired') {
          await conn.commit();
          return publicRedemption(redemption);
        }
        if (redemption.status !== 'pending') {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Une récompense confirmée ne peut plus être annulée' });
        }

        await refundPendingRedemption(conn, redemption, 'cancelled');
        const [updatedRows] = await conn.execute('SELECT * FROM reward_redemptions WHERE id = ?', [redemption.id]) as any[];
        await conn.commit();
        return publicRedemption((updatedRows as any[])[0]);
      } catch (error) {
        try { await conn.rollback(); } catch { /* déjà rollback */ }
        throw error;
      } finally {
        conn.release();
      }
    }),

  confirmRewardRedemption: merchantProcedure
    .input(z.object({ token: z.string().min(40).max(500), shopId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const parsed = parseAndVerifyRedemptionToken(input.token);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [rows] = await conn.execute(
          'SELECT * FROM reward_redemptions WHERE id = ? FOR UPDATE',
          [parsed.id]
        ) as any[];
        const redemption = (rows as any[])[0];
        if (!redemption) throw new TRPCError({ code: 'NOT_FOUND', message: 'Échange introuvable' });

        const storedHash = Buffer.from(redemption.token_hash, 'hex');
        const suppliedHash = Buffer.from(sha256(input.token), 'hex');
        if (
          storedHash.length !== suppliedHash.length ||
          !timingSafeEqual(storedHash, suppliedHash) ||
          redemption.token_nonce !== parsed.nonce
        ) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'QR CivicLoop invalide' });
        }

        if (Number(redemption.shop_id) !== input.shopId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cette récompense appartient à une autre boutique' });
        }

        if (!['admin', 'super_admin'].includes(ctx.user.role)) {
          const [accessRows] = await conn.execute(
            `SELECT id FROM merchant_shops
             WHERE user_id = ? AND shop_id = ? AND is_active = 1 LIMIT 1`,
            [ctx.user.id, input.shopId]
          ) as any[];
          if ((accessRows as any[]).length === 0) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Vous n’êtes pas autorisé pour cette boutique' });
          }
        }

        if (redemption.status === 'confirmed') {
          await conn.commit();
          return publicRedemption(redemption);
        }
        if (redemption.status !== 'pending') {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Ce QR n’est plus utilisable' });
        }

        if (new Date(redemption.expires_at).getTime() <= Date.now() || parsed.expiresAt.getTime() <= Date.now()) {
          await refundPendingRedemption(conn, redemption, 'expired');
          await conn.commit();
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Ce QR a expiré, les crédits ont été remboursés' });
        }

        await conn.execute(
          `UPDATE reward_redemptions
           SET status = 'confirmed', confirmed_at = NOW(), confirmed_by_user_id = ?
           WHERE id = ? AND status = 'pending'`,
          [ctx.user.id, redemption.id]
        );
        const [updatedRows] = await conn.execute('SELECT * FROM reward_redemptions WHERE id = ?', [redemption.id]) as any[];
        await conn.commit();
        return publicRedemption((updatedRows as any[])[0]);
      } catch (error) {
        try { await conn.rollback(); } catch { /* déjà rollback */ }
        throw error;
      } finally {
        conn.release();
      }
    }),
});
