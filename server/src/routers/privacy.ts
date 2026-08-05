// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { createHash, randomBytes } from 'crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { db } from '../db';
import { logAudit, revokeAllUserTokens, verifyPassword } from '../lib/auth';

async function safeRows(sql: string, params: any[] = []) {
  try {
    const [rows] = await db.execute(sql, params) as any[];
    return rows as any[];
  } catch (error: any) {
    // Une table fonctionnelle optionnelle ne doit pas bloquer l'export complet.
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') return [];
    throw error;
  }
}

function hashIp(ip?: string) {
  if (!ip) return null;
  const salt = process.env.CITY_HASH_SALT || process.env.JWT_SECRET || 'villeconnect';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export const privacyRouter = router({
  exportMyData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [profileRows, wallets, transactions, missionCompletions, rewardClaims, redemptions, devices] = await Promise.all([
      safeRows(
        `SELECT id, email, name, role, postalCode, city, email_verified_at AS emailVerifiedAt,
                theme_preference AS themePreference, createdAt, lastSignedIn
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      ),
      safeRows(
        `SELECT available_balance AS availableBalance, total_earned AS totalEarned,
                total_spent AS totalSpent, created_at AS createdAt, updated_at AS updatedAt
         FROM civic_wallets WHERE user_id = ?`,
        [userId]
      ),
      safeRows(
        `SELECT id, type, amount, mission_id AS missionId, merchant_id AS merchantId,
                description, created_at AS createdAt
         FROM civic_transactions WHERE user_id = ? ORDER BY id ASC`,
        [userId]
      ),
      safeRows(
        `SELECT id, mission_id AS missionId, credits_earned AS creditsEarned,
                completed_at AS completedAt
         FROM mission_completions WHERE user_id = ? ORDER BY id ASC`,
        [userId]
      ),
      safeRows(
        `SELECT id, reward_id AS rewardId, credits_spent AS creditsSpent,
                status, claimed_at AS claimedAt
         FROM reward_claims WHERE user_id = ? ORDER BY id ASC`,
        [userId]
      ),
      safeRows(
        `SELECT id, reward_id AS rewardId, shop_id AS shopId, reward_title AS rewardTitle,
                credits_spent AS creditsSpent, status, expires_at AS expiresAt,
                confirmed_at AS confirmedAt, cancelled_at AS cancelledAt,
                created_at AS createdAt
         FROM reward_redemptions WHERE user_id = ? ORDER BY id ASC`,
        [userId]
      ),
      safeRows(
        `SELECT platform, created_at AS createdAt, last_seen_at AS lastSeenAt
         FROM user_devices WHERE user_id = ? ORDER BY id ASC`,
        [userId]
      ),
    ]);

    if (!profileRows[0]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable.' });
    }

    try {
      await db.execute(
        `INSERT INTO privacy_requests (
           user_id, request_type, status, processed_at, created_ip_hash
         ) VALUES (?, 'export', 'completed', CURRENT_TIMESTAMP, ?)`,
        [userId, hashIp(ctx.ip)]
      );
    } catch (error: any) {
      if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
    }

    await logAudit(userId, 'privacy_export_generated', 'user', String(userId), undefined, ctx.ip);

    return {
      format: 'VilleConnect-Data-Export-v1',
      generatedAt: new Date().toISOString(),
      controller: 'Js-Innov.IA — VilleConnect OS',
      profile: profileRows[0],
      wallet: wallets[0] || null,
      transactions,
      missionCompletions,
      rewardClaims,
      rewardRedemptions: redemptions,
      devices,
      notes: [
        'Les mots de passe, jetons de session et secrets techniques ne sont jamais exportés.',
        'Certaines écritures peuvent être conservées après effacement lorsqu’une obligation légale ou de sécurité l’exige.',
      ],
    };
  }),

  eraseMyAccount: protectedProcedure
    .input(z.object({
      password: z.string().min(1).max(128),
      confirmation: z.literal('SUPPRIMER'),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const [rows] = await db.execute(
        `SELECT id, password_hash AS passwordHash, role, is_active AS isActive
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      ) as any[];
      const account = (rows as any[])[0];

      if (!account || !account.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte actif introuvable.' });
      }
      if (!account.passwordHash || !(await verifyPassword(input.password, account.passwordHash))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Mot de passe incorrect.' });
      }
      if (['admin', 'super_admin', 'city_admin', 'merchant'].includes(account.role)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Un compte disposant de responsabilités doit être transféré ou désactivé par un administrateur.',
        });
      }

      const connection = await db.getConnection();
      const anonymizedEmail = `deleted-${userId}-${randomBytes(8).toString('hex')}@invalid.local`;
      const anonymizedOpenId = `deleted-${userId}-${randomBytes(12).toString('hex')}`;

      try {
        await connection.beginTransaction();

        let privacyRequestId: number | null = null;
        try {
          const [requestResult] = await connection.execute(
            `INSERT INTO privacy_requests (
               user_id, request_type, status, requested_at, processed_at, created_ip_hash,
               processing_note
             ) VALUES (?, 'erasure', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?,
                       'Anonymisation automatique après réauthentification')`,
            [userId, hashIp(ctx.ip)]
          ) as any[];
          privacyRequestId = Number((requestResult as any).insertId);
        } catch (error: any) {
          if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
        }

        await connection.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM push_tokens WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM user_devices WHERE user_id = ?', [userId]);
        await connection.execute(
          `UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
           WHERE user_id = ?`,
          [userId]
        );

        // Les événements soumis mais non publiés sont supprimés ; les événements approuvés
        // conservent uniquement leur contenu public, sans coordonnées privées.
        await connection.execute(
          `UPDATE events
           SET organizerEmail = '', organizerPhone = ''
           WHERE organizerEmail = (SELECT email FROM users WHERE id = ? LIMIT 1)`,
          [userId]
        );

        await connection.execute(
          `UPDATE audit_logs SET metadata = NULL, ip = NULL WHERE actor_user_id = ?`,
          [userId]
        );

        // Le user_id numérique est conservé afin de ne pas falsifier le grand livre CivicLoop.
        // Toutes les données directement identifiantes et les moyens d'authentification sont retirés.
        await connection.execute(
          `UPDATE users SET
             email = ?, openId = ?, password_hash = NULL, name = NULL,
             postalCode = NULL, city = NULL, email_verified_at = NULL,
             theme_preference = 'auto', is_active = 0
           WHERE id = ?`,
          [anonymizedEmail, anonymizedOpenId, userId]
        );

        await connection.commit();
        await revokeAllUserTokens(userId);
        await logAudit(null, 'privacy_erasure_completed', 'privacy_request', privacyRequestId ? String(privacyRequestId) : null);
        return {
          success: true,
          message: 'Le compte a été désactivé et ses données directement identifiantes ont été anonymisées.',
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }),
});
