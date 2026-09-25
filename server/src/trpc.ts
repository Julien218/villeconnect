// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { initTRPC, TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { db } from './db';

export interface Context {
  user?: { id: number; openId: string; role: string; email_verified: boolean; authType: 'access' | 'device' };
  ip?: string;
  userAgent?: string;
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.code === 'INTERNAL_SERVER_ERROR' ? 'Erreur interne du serveur' : shape.message,
      data: { ...shape.data, stack: undefined },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Nécessite un token Bearer valide — access token (auth.login/register) ou, pour
// compatibilité descendante, un ancien device token (auth.deviceLogin, invités).
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentification requise' });
  }
  const [rows] = await db.execute(
    'SELECT openId, role, email, password_hash, loginMethod, is_active, merged_into_user_id, email_verified_at FROM users WHERE id = ?',
    [ctx.user.id]
  ) as any[];
  const current = (rows as any[])[0];
  if (!current || !current.is_active || current.merged_into_user_id || current.openId !== ctx.user.openId ||
      (ctx.user.authType === 'device' && (current.email || current.password_hash ||
        current.role !== 'citizen' || current.loginMethod !== 'anonymous'))) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session invalide, reconnectez-vous' });
  }
  // Les droits actuels prévalent sur ceux d'un ancien JWT, même signé.
  const user = { ...ctx.user, role: current.role, email_verified: Boolean(current.email_verified_at) };
  return next({ ctx: { ...ctx, user } });
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

// Réservée à l'administration globale de la plateforme.
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'super_admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs' });
  }
  return next({ ctx });
});

export function createContext(req: any): Context {
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return { ip, userAgent };
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'] }) as any;
    if (!Number.isSafeInteger(Number(decoded?.sub)) || Number(decoded.sub) <= 0 ||
        typeof decoded.openId !== 'string' || !decoded.openId ||
        !['access', 'device'].includes(decoded.type)) return { ip, userAgent };
    return {
      ip,
      userAgent,
      user: {
        id: Number(decoded.sub),
        openId: decoded.openId,
        role: decoded.role || 'citizen',
        email_verified: Boolean(decoded.email_verified),
        authType: decoded.type === 'access' ? 'access' : 'device',
      },
    };
  } catch {
    return { ip, userAgent };
  }
}
