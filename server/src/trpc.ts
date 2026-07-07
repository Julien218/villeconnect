// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { initTRPC, TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

export interface Context {
  user?: { id: number; openId: string; role: string };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Nécessite un token Bearer valide (voir routers/auth.ts → deviceLogin pour l'émission).
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentification requise' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Réservé aux rôles admin / commune (modération, opérations communales).
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'commune'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs / à la commune' });
  }
  return next({ ctx });
});

export function createContext(req: any): Context {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return {};
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!decoded?.sub || !decoded?.openId) return {};
    return { user: { id: Number(decoded.sub), openId: decoded.openId, role: decoded.role || 'user' } };
  } catch {
    return {};
  }
}
