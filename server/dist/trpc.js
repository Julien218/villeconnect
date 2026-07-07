"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProcedure = exports.cityAdminProcedure = exports.merchantProcedure = exports.protectedProcedure = exports.publicProcedure = exports.router = void 0;
exports.createContext = createContext;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const server_1 = require("@trpc/server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const t = server_1.initTRPC.context().create();
exports.router = t.router;
exports.publicProcedure = t.procedure;
// Nécessite un token Bearer valide — access token (auth.login/register) ou, pour
// compatibilité descendante, un ancien device token (auth.deviceLogin, invités).
exports.protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new server_1.TRPCError({ code: 'UNAUTHORIZED', message: 'Authentification requise' });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
});
// Réservée aux commerçants (dashboard commerçant) — admin/super_admin ont aussi accès.
exports.merchantProcedure = exports.protectedProcedure.use(({ ctx, next }) => {
    if (!['merchant', 'admin', 'super_admin'].includes(ctx.user.role)) {
        throw new server_1.TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux commerçants' });
    }
    return next({ ctx });
});
// Réservée à la modération communale (ex: approbation d'événements) — admin/super_admin inclus.
exports.cityAdminProcedure = exports.protectedProcedure.use(({ ctx, next }) => {
    if (!['city_admin', 'admin', 'super_admin'].includes(ctx.user.role)) {
        throw new server_1.TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs communaux' });
    }
    return next({ ctx });
});
// Réservée à l'administration globale de la plateforme.
exports.adminProcedure = exports.protectedProcedure.use(({ ctx, next }) => {
    if (!['admin', 'super_admin'].includes(ctx.user.role)) {
        throw new server_1.TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs' });
    }
    return next({ ctx });
});
function createContext(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return { ip, userAgent };
    try {
        const token = auth.slice(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded?.sub || !decoded?.openId)
            return { ip, userAgent };
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
    }
    catch {
        return { ip, userAgent };
    }
}
