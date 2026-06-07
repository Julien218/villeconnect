"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectedProcedure = exports.publicProcedure = exports.router = void 0;
exports.createContext = createContext;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const server_1 = require("@trpc/server");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const t = server_1.initTRPC.context().create();
exports.router = t.router;
exports.publicProcedure = t.procedure;
exports.protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new server_1.TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
});
function createContext(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return {};
    try {
        const token = auth.slice(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev-secret');
        return { user: { id: decoded.sub || decoded.id, email: decoded.email, role: decoded.role || 'citizen' } };
    }
    catch {
        return {};
    }
}
