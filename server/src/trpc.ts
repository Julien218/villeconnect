// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { initTRPC, TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { db } from './db';

export interface Context {
  user?: { id: number; openId: string; role: string; email_verified: boolean; authType: 'access' | 'device' };
  ip?: string;
  userAgent?: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';

const t = initTRPC.context<Context>().create({
  // Jamais de pile d'appels envoyée au client hors développement local.
  isDev: isDevelopment,
  errorFormatter({ shape, error }) {
    // Une erreur interne (SQL, réseau…) ne doit jamais révéler de détail technique au client.
    if (error.code === 'INTERNAL_SERVER_ERROR' && !isDevelopment) {
      return { ...shape, message: 'Erreur interne, réessayez dans un instant.' };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Nécessite un token Bearer valide — access token (auth.login/register) ou, pour
// compatibilité descendante, un ancien device token (auth.deviceLogin, invités).
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentification requise' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Réservée aux commerçants (dashboard commerçant) — admin/super_admin ont aussi accès.
export const merchantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['merchant', 'admin', 'super_admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux commerçants' });
  }
  return next({ ctx });
});

// Réservée à la modération communale (ex: approbation d'événements) — admin/super_admin inclus.
export const cityAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['city_admin', 'admin', 'super_admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs communaux' });
  }
  return next({ ctx });
});

const GLOBAL_ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Cloisonnement par commune : un `city_admin` ne modère que les codes postaux qui lui ont été
 * attribués (table `admin_city_scopes`). Les administrateurs de la plateforme ont accès à tout.
 * Lit la base à chaque appel : un retrait de droit prend effet immédiatement.
 */
export async function assertCityScope(user: { id: number; role: string }, postalCode: string | null | undefined): Promise<void> {
  if (GLOBAL_ADMIN_ROLES.includes(user.role)) return;
  const code = (postalCode || '').trim();
  if (user.role === 'city_admin' && code) {
    const [rows] = await db.execute(
      `SELECT 1 FROM admin_city_scopes s JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ? AND s.postal_code = ? AND u.role = 'city_admin' AND u.is_active = 1 LIMIT 1`,
      [user.id, code]
    ) as any[];
    if ((rows as any[]).length > 0) return;
  }
  throw new TRPCError({ code: 'FORBIDDEN', message: 'Cette commune ne fait pas partie de votre périmètre.' });
}

// Réservée à l'administration globale de la plateforme.
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'super_admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs' });
  }
  return next({ ctx });
});

export function createContext(req: any): Context {
  // req.ip tient compte de `trust proxy` (1 saut) : on ne lit jamais directement
  // l'en-tête x-forwarded-for, que le client peut falsifier pour contourner les limites de débit.
  const ip: string | undefined = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return { ip, userAgent };
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'] }) as any;
    if (!decoded?.sub || !decoded?.openId) return { ip, userAgent };
    const isAccess = decoded.type === 'access';
    return {
      ip,
      userAgent,
      user: {
        id: Number(decoded.sub),
        openId: decoded.openId,
        // Un jeton « appareil » (invité) n'a JAMAIS de rôle privilégié, quel que soit son contenu.
        role: isAccess ? (decoded.role || 'citizen') : 'citizen',
        email_verified: isAccess ? Boolean(decoded.email_verified) : false,
        authType: isAccess ? 'access' : 'device',
      },
    };
  } catch {
    return { ip, userAgent };
  }
}
