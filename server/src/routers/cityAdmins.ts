// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Attribution des communes aux administrateurs communaux (réservé à l'administration de la plateforme).
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from '../trpc';
import { db } from '../db';
import { logAudit, revokeAllUserTokens } from '../lib/auth';

const postalCode = z.string().trim().regex(/^\d{4}$/, 'Code postal belge à 4 chiffres');
const email = z.string().trim().email().max(190).transform(v => v.toLowerCase());

async function userByEmail(address: string) {
  const [rows] = await db.execute('SELECT id, role FROM users WHERE email = ? LIMIT 1', [address]) as any[];
  const user = (rows as any[])[0];
  if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Aucun compte avec cet email.' });
  return user as { id: number; role: string };
}

export const cityAdminsRouter = router({
  list: adminProcedure
    .input(z.object({ postalCode: postalCode.optional() }).default({}))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT u.id AS userId, u.email, u.name, s.postal_code AS postalCode, s.created_at AS grantedAt
         FROM admin_city_scopes s JOIN users u ON u.id = s.user_id
         WHERE u.role = 'city_admin' ${input.postalCode ? 'AND s.postal_code = ?' : ''}
         ORDER BY s.postal_code, u.email LIMIT 500`,
        input.postalCode ? [input.postalCode] : []
      ) as any[];
      return rows;
    }),

  grant: adminProcedure
    .input(z.object({ email, postalCode }))
    .mutation(async ({ ctx, input }) => {
      const user = await userByEmail(input.email);
      if (['admin', 'super_admin'].includes(user.role)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce compte est déjà administrateur de la plateforme.' });
      }
      if (user.role === 'merchant') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Un compte commerçant ne peut pas être administrateur communal : utilisez un autre compte.' });
      }
      await db.execute(
        'INSERT IGNORE INTO admin_city_scopes (user_id, postal_code, granted_by_user_id) VALUES (?, ?, ?)',
        [user.id, input.postalCode, ctx.user.id]
      );
      if (user.role !== 'city_admin') {
        await db.execute(`UPDATE users SET role = 'city_admin' WHERE id = ?`, [user.id]);
        // Le nouveau rôle est pris en compte à la prochaine connexion.
        await revokeAllUserTokens(user.id);
      }
      await logAudit(ctx.user.id, 'city_admin_grant', 'user', String(user.id), { postalCode: input.postalCode }, ctx.ip);
      return { success: true };
    }),

  revoke: adminProcedure
    .input(z.object({ email, postalCode }))
    .mutation(async ({ ctx, input }) => {
      const user = await userByEmail(input.email);
      await db.execute('DELETE FROM admin_city_scopes WHERE user_id = ? AND postal_code = ?', [user.id, input.postalCode]);
      const [left] = await db.execute('SELECT COUNT(*) AS n FROM admin_city_scopes WHERE user_id = ?', [user.id]) as any[];
      if (Number((left as any[])[0].n) === 0 && user.role === 'city_admin') {
        await db.execute(`UPDATE users SET role = 'citizen' WHERE id = ?`, [user.id]);
        await revokeAllUserTokens(user.id);
      }
      await logAudit(ctx.user.id, 'city_admin_revoke', 'user', String(user.id), { postalCode: input.postalCode }, ctx.ip);
      return { success: true };
    }),
});
