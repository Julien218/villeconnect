// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '../db';
import { getOrCreateUserId, upsertUserDevice } from '../lib/users';
import { mergeGuestDeviceIntoAccount } from '../lib/walletMerge';
import {
  hashPassword,
  verifyPassword,
  issueAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  logAudit,
  checkRateLimit,
} from '../lib/auth';

const passwordSchema = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères')
  .max(128)
  .refine(pw => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw), {
    message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
  });

async function findUserByEmail(email: string) {
  const [rows] = await db.execute(
    'SELECT id, email, password_hash, role, email_verified_at, is_active FROM users WHERE email = ?',
    [email]
  ) as any[];
  return (rows as any[])[0] || null;
}

export const authRouter = router({
  // Conservée pour compatibilité — flux invité anonyme historique (wallet public avant
  // login). Reste inoffensive : n'attribue jamais de rôle privilégié ni d'email.
  deviceLogin: publicProcedure
    .input(z.object({ openId: z.string().min(8).max(128), postalCode: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { id } = await getOrCreateUserId(input.openId, input.postalCode);
      // Un identifiant appareil ne doit jamais ouvrir la session d'un vrai compte
      // (email, mot de passe, rôle commerçant ou admin) : on exige une connexion normale.
      const [accountRows] = await db.execute(
        'SELECT email, password_hash, role FROM users WHERE id = ?', [id]
      ) as any[];
      const account = (accountRows as any[])[0];
      if (account && (account.email || account.password_hash || account.role !== 'citizen')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cet appareil est lié à un compte : connectez-vous avec votre email.',
        });
      }
      const token = jwt.sign(
        { sub: id, openId: input.openId, role: 'citizen', type: 'device' },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );
      return { token, role: 'citizen' };
    }),

  // Inscription citoyenne publique. Si `deviceOpenId` correspond à un device anonyme
  // déjà connu (wallet CivicLoop existant), le compte est créé SUR CETTE MÊME LIGNE
  // users — le wallet/missions/transactions restent donc automatiquement attachés,
  // aucune copie de données n'est nécessaire.
  register: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      password: passwordSchema,
      postalCode: z.string().max(4).optional(),
      city: z.string().max(128).optional(),
      name: z.string().max(128).optional(),
      deviceOpenId: z.string().min(8).max(128).optional(),
      themePreference: z.enum(['light', 'dark', 'auto']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rateKey = `register:${ctx.ip || 'unknown'}`;
      if (!checkRateLimit(rateKey, 5, 15 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives, réessayez plus tard' });
      }

      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Un compte existe déjà avec cet email' });
      }

      const passwordHash = await hashPassword(input.password);
      let userId: number;

      if (input.deviceOpenId) {
        const [deviceRows] = await db.execute(
          'SELECT id, email FROM users WHERE openId = ?', [input.deviceOpenId]
        ) as any[];
        const deviceUser = (deviceRows as any[])[0];

        if (deviceUser && deviceUser.email) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Ce device est déjà lié à un compte existant, connectez-vous plutôt' });
        }

        if (deviceUser) {
          // Claim en place : le wallet CivicLoop existant reste attaché (même user_id).
          await db.execute(
            `UPDATE users SET email = ?, password_hash = ?, role = 'citizen', loginMethod = 'password',
             name = COALESCE(?, name), postalCode = COALESCE(?, postalCode), city = COALESCE(?, city),
             theme_preference = COALESCE(?, theme_preference)
             WHERE id = ?`,
            [input.email, passwordHash, input.name || null, input.postalCode || null, input.city || null, input.themePreference || null, deviceUser.id]
          );
          userId = deviceUser.id;
        } else {
          const [result] = await db.execute(
            `INSERT INTO users (openId, email, password_hash, name, role, loginMethod, postalCode, city, theme_preference)
             VALUES (?, ?, ?, ?, 'citizen', 'password', ?, ?, ?)`,
            [input.deviceOpenId, input.email, passwordHash, input.name || null, input.postalCode || null, input.city || null, input.themePreference || 'auto']
          ) as any[];
          userId = (result as any).insertId;
        }
      } else {
        const generatedOpenId = `acct-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        const [result] = await db.execute(
          `INSERT INTO users (openId, email, password_hash, name, role, loginMethod, postalCode, city, theme_preference)
           VALUES (?, ?, ?, ?, 'citizen', 'password', ?, ?, ?)`,
          [generatedOpenId, input.email, passwordHash, input.name || null, input.postalCode || null, input.city || null, input.themePreference || 'auto']
        ) as any[];
        userId = (result as any).insertId;
      }

      if (input.deviceOpenId) {
        try { await upsertUserDevice(userId, input.deviceOpenId); }
        catch (e) { console.error('[register] échec upsert user_devices (non bloquant):', (e as Error).message); }
      }

      const verificationToken = await createEmailVerificationToken(userId);
      const emailSent = await sendVerificationEmail(input.email, verificationToken);
      await logAudit(userId, 'register', 'user', String(userId), { email: input.email, emailSent }, ctx.ip);

      return { success: true, message: 'Compte créé. Vérifiez votre boîte email pour confirmer votre adresse.' };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
      // OpenId de l'appareil courant + plateforme — permet (a) de fusionner un
      // éventuel wallet invité accumulé sur CET appareil dans le compte qu'on
      // vient d'authentifier, et (b) de renseigner user_devices pour l'audit.
      deviceOpenId: z.string().min(8).max(128).optional(),
      platform: z.string().max(32).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rateKey = `login:${ctx.ip || 'unknown'}:${input.email}`;
      if (!checkRateLimit(rateKey, 8, 15 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives, réessayez plus tard' });
      }

      const user = await findUserByEmail(input.email);
      // Message générique volontaire (email inconnu / mdp faux / pas de mdp défini) —
      // ne jamais révéler laquelle des conditions a échoué (anti-énumération de comptes).
      const genericError = new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect' });

      if (!user || !user.password_hash) {
        await logAudit(null, 'login_failed', 'user', input.email, { reason: 'unknown_email' }, ctx.ip);
        throw genericError;
      }
      if (!user.is_active) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Ce compte est désactivé' });
      }
      const validPassword = await verifyPassword(input.password, user.password_hash);
      if (!validPassword) {
        await logAudit(user.id, 'login_failed', 'user', String(user.id), { reason: 'bad_password' }, ctx.ip);
        throw genericError;
      }

      const [userRow] = await db.execute('SELECT openId FROM users WHERE id = ?', [user.id]) as any[];
      const openId = (userRow as any[])[0].openId;

      // Réconciliation wallet multi-appareil : si ce device avait un wallet invité
      // (openId différent, jamais lié à un vrai compte), on le fusionne dans CE
      // compte qui vient d'être authentifié. Sûr, idempotent, jamais bloquant pour
      // le login lui-même même en cas d'échec inattendu.
      //
      // `deviceOwnedByThisAccount` protège user_devices : on ne veut JAMAIS y
      // enregistrer un openId qui appartient en réalité à un AUTRE identifiant
      // (donor déjà fusionné ailleurs, ou vrai compte tiers) — sinon la table
      // finirait par mentir sur quel appareil appartient à quel compte.
      let deviceOwnedByThisAccount = input.deviceOpenId === openId;
      if (input.deviceOpenId && input.deviceOpenId !== openId) {
        try {
          const mergeResult = await mergeGuestDeviceIntoAccount(input.deviceOpenId, user.id, ctx.ip);
          if (mergeResult.merged) {
            deviceOwnedByThisAccount = true;
            console.log(`[login] wallet fusionné pour user ${user.id}: +${mergeResult.creditsTransferred} CL, ${mergeResult.missionsReattached} mission(s) ré-attachée(s), ${mergeResult.missionsDeduped} doublon(s) ignoré(s)`);
          } else if (mergeResult.reason === 'donor_not_found') {
            // Device jamais vu nulle part — appareil neuf, légitimement à ce compte.
            deviceOwnedByThisAccount = true;
          }
          // 'donor_has_account' / 'already_merged_elsewhere' : cet openId identifie
          // en réalité un AUTRE compte/donor — on ne le rattache surtout pas ici.
        } catch (e) {
          console.error('[login] échec fusion wallet (non bloquant):', (e as Error).message);
        }
      }

      await db.execute('UPDATE users SET lastSignedIn = NOW() WHERE id = ?', [user.id]);

      if (input.deviceOpenId && deviceOwnedByThisAccount) {
        try { await upsertUserDevice(user.id, input.deviceOpenId, input.platform); }
        catch (e) { console.error('[login] échec upsert user_devices (non bloquant):', (e as Error).message); }
      }

      const accessToken = issueAccessToken({
        id: user.id, openId, role: user.role, email_verified: Boolean(user.email_verified_at),
      });
      const refreshToken = await issueRefreshToken(user.id, { userAgent: ctx.userAgent, ip: ctx.ip });

      await logAudit(user.id, 'login_success', 'user', String(user.id), undefined, ctx.ip);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id, email: user.email, role: user.role,
          emailVerified: Boolean(user.email_verified_at),
        },
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [rows] = await db.execute(
      'SELECT id, email, name, role, postalCode, city, email_verified_at, theme_preference FROM users WHERE id = ?',
      [ctx.user!.id]
    ) as any[];
    const user = (rows as any[])[0];
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable' });
    return {
      id: user.id, email: user.email, name: user.name, role: user.role,
      postalCode: user.postalCode, city: user.city,
      emailVerified: Boolean(user.email_verified_at),
      themePreference: user.theme_preference || 'auto',
    };
  }),

  logout: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      await revokeRefreshToken(input.refreshToken);
      return { success: true };
    }),

  refresh: publicProcedure
    .input(z.object({
      refreshToken: z.string(),
      // Optionnels — permet de rafraîchir user_devices.last_seen_at à chaque
      // refresh silencieux, sans jamais déclencher de fusion (la fusion n'a lieu
      // qu'à un login explicite email/mot de passe, jamais en tâche de fond).
      deviceOpenId: z.string().min(8).max(128).optional(),
      platform: z.string().max(32).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await rotateRefreshToken(input.refreshToken, { userAgent: ctx.userAgent, ip: ctx.ip });
      if (!result) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session invalide ou expirée, reconnectez-vous' });
      }
      const [rows] = await db.execute(
        'SELECT openId, role, email_verified_at FROM users WHERE id = ?', [result.userId]
      ) as any[];
      const u = (rows as any[])[0];

      if (input.deviceOpenId) {
        try { await upsertUserDevice(result.userId, input.deviceOpenId, input.platform); }
        catch (e) { console.error('[refresh] échec upsert user_devices (non bloquant):', (e as Error).message); }
      }

      const accessToken = issueAccessToken({
        id: result.userId, openId: u.openId, role: u.role, email_verified: Boolean(u.email_verified_at),
      });
      return { accessToken, refreshToken: result.newRefreshToken };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await consumeEmailVerificationToken(input.token);
      if (!userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lien de vérification invalide ou expiré' });
      }
      await db.execute('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [userId]);
      await logAudit(userId, 'email_verified', 'user', String(userId), undefined, ctx.ip);
      return { success: true };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const rateKey = `pwreset:${ctx.ip || 'unknown'}:${input.email}`;
      if (!checkRateLimit(rateKey, 4, 15 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives, réessayez plus tard' });
      }
      // Réponse toujours identique, que l'email existe ou non (anti-énumération de comptes).
      const user = await findUserByEmail(input.email);
      if (user) {
        const token = await createPasswordResetToken(user.id);
        await sendPasswordResetEmail(input.email, token);
        await logAudit(user.id, 'password_reset_requested', 'user', String(user.id), undefined, ctx.ip);
      }
      return { success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), newPassword: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = await consumePasswordResetToken(input.token);
      if (!userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lien de réinitialisation invalide ou expiré' });
      }
      const passwordHash = await hashPassword(input.newPassword);
      await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
      // Sécurité : un reset de mot de passe invalide TOUTES les sessions actives.
      await revokeAllUserTokens(userId);
      await logAudit(userId, 'password_reset_completed', 'user', String(userId), undefined, ctx.ip);
      return { success: true, message: 'Mot de passe mis à jour, reconnectez-vous.' };
    }),
  // Mise à jour du profil citoyen (nom, code postal, ville) — nécessite une session active.
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().max(128).optional(),
      postalCode: z.string().max(4).optional(),
      city: z.string().max(128).optional(),
      themePreference: z.enum(['light', 'dark', 'auto']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const fields: string[] = [];
      const values: any[] = [];
      if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
      if (input.postalCode !== undefined) { fields.push('postalCode = ?'); values.push(input.postalCode); }
      if (input.city !== undefined) { fields.push('city = ?'); values.push(input.city); }
      if (input.themePreference !== undefined) { fields.push('theme_preference = ?'); values.push(input.themePreference); }

      if (fields.length === 0) {
        return { success: true, message: 'Aucune modification' };
      }

      values.push(ctx.user!.id);
      await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      await logAudit(ctx.user!.id, 'profile_updated', 'user', String(ctx.user!.id), { fields: Object.keys(input) }, ctx.ip);
      return { success: true, message: 'Profil mis à jour' };
    }),
});

