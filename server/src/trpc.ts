// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

export interface Context {
  user?: { id: string; email: string; role: string };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function createContext(req: any): Context {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return {};
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    return { user: { id: decoded.sub || decoded.id, email: decoded.email, role: decoded.role || 'citizen' } };
  } catch {
    return {};
  }
}
