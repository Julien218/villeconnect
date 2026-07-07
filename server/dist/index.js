"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Backend API Server (tRPC v11 + Express)
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const trpcExpress = __importStar(require("@trpc/server/adapters/express"));
const trpc_1 = require("./trpc");
const shops_1 = require("./routers/shops");
const events_1 = require("./routers/events");
const fuel_1 = require("./routers/fuel");
const wallet_1 = require("./routers/wallet");
const alerts_1 = require("./routers/alerts");
const auth_1 = require("./routers/auth");
const db_1 = require("./db");
// ─── App Router ───────────────────────────────────────────
exports.appRouter = (0, trpc_1.router)({
    shops: shops_1.shopsRouter,
    events: events_1.eventsRouter,
    fuel: fuel_1.fuelRouter,
    wallet: wallet_1.walletRouter,
    alerts: alerts_1.alertsRouter,
    auth: auth_1.authRouter,
});
// ─── Express ──────────────────────────────────────────────
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'VilleConnect API', version: '2.0.1', ts: new Date().toISOString() });
});
// tRPC handler
app.use('/api/trpc', trpcExpress.createExpressMiddleware({
    router: exports.appRouter,
    createContext: ({ req }) => (0, trpc_1.createContext)(req),
}));
// Root info
app.get('/', (_req, res) => {
    res.json({
        name: 'VilleConnect OS API',
        version: '2.0.1',
        endpoints: {
            health: '/health',
            trpc: '/api/trpc',
            docs: 'https://villeconnect-production.up.railway.app',
        },
    });
});
// DEBUG — schema inspector : STRICTEMENT réservé au développement local.
// Ne JAMAIS enregistrer cette route quand NODE_ENV=production (Railway le définit
// automatiquement) — évite toute exposition publique du schéma de la base.
if (process.env.NODE_ENV === 'development') {
    app.get('/api/schema/:table', async (req, res) => {
        try {
            const [rows] = await db_1.db.execute(`DESCRIBE \`${req.params.table}\``);
            res.json(rows);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}
app.listen(PORT, () => {
    console.log(`🏙️  VilleConnect API running on port ${PORT}`);
    console.log(`✅  tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});
