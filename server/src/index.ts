// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Backend API Server (tRPC v11 + Express)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { router, createContext } from './trpc';
import { shopsRouter } from './routers/shops';
import { commerceRouter } from './routers/commerce';
import { eventsRouter } from './routers/events';
import { fuelRouter } from './routers/fuel';
import { walletRouter } from './routers/wallet';
import { alertsRouter } from './routers/alerts';
import { authRouter } from './routers/auth';
import { privacyRouter } from './routers/privacy';
import { waitlistRouter } from './routers/waitlist';
import { cityRouter } from './routers/city';


// ─── App Router ───────────────────────────────────────────
export const appRouter = router({
  shops: shopsRouter, // compatibilité temporaire avec les anciens clients
  commerce: commerceRouter,
  events: eventsRouter,
  fuel: fuelRouter,
  wallet: walletRouter,
  alerts: alertsRouter,
  auth: authRouter,
  privacy: privacyRouter,
  waitlist: waitlistRouter,
  city: cityRouter,
});

export type AppRouter = typeof appRouter;

// ─── Express ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '2.3.0';

app.disable('x-powered-by');
// Aucun en-tête client ne fait autorité sans proxy explicitement approuvé.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10) {
  throw new Error('TRUST_PROXY_HOPS invalide');
}
app.set('trust proxy', proxyHops);

const defaultOrigins = [
  'https://villeconnectos.com',
  'https://www.villeconnectos.com',
  'https://app.villeconnectos.com',
];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

app.use(cors({
  origin(origin, callback) {
    // Les applications mobiles natives n'envoient généralement pas d'en-tête Origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(Object.assign(new Error('Origine non autorisée'), { status: 403 }));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json({ limit: '64kb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'VilleConnect API', version: VERSION, ts: new Date().toISOString() });
});

// tRPC handler
app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => createContext(req),
    onError({ path, error }) {
      // Pas de payload, token ou donnée personnelle dans les logs.
      console.error(JSON.stringify({
        level: 'error',
        scope: 'trpc',
        path: path || 'unknown',
        code: error.code,
      }));
    },
  })
);

// Root info
app.get('/', (_req, res) => {
  res.json({
    name: 'VilleConnect OS API',
    version: VERSION,
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
    },
  });
});

// L'inspection du schéma se fait via un accès DB administratif, jamais par HTTP.

app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Ne jamais transmettre stack, requête SQL ou détails du parseur au client.
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = [400, 403, 413].includes(error.status) ? error.status : 500;
  res.status(status).json({ error: status === 500 ? 'Erreur interne du serveur' : 'Requête refusée' });
});

app.listen(PORT, () => {
  console.log(`🏙️  VilleConnect API ${VERSION} running on port ${PORT}`);
  console.log(`✅  tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  console.log(`🏪  Commerce catalog: /api/trpc/commerce.*`);
  console.log(`🔐  Privacy rights: /api/trpc/privacy.*`);
});
