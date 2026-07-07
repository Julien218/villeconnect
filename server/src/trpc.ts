// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { initTRPC, TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

export interface Context {
  user?: { id: number; openId: string; role: string; email_verified: boolean; authType: 'access' | 'device' };
  ip?: string;
  userAgent?: string;
}

const t = initTRPC.context<Context>().create();

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

// Réservée à l'administration globale de la plateforme.
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'super_admin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs' });
  }
  return next({ ctx });
});

export function createContext(req: any): Context {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return { ip, userAgent };
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!decoded?.sub || !decoded?.openId) return { ip, userAgent };
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
