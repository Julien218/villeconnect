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
import { organizersRouter } from './routers/organizers';
import { merchantRouter } from './routers/merchant';
import { ordersRouter } from './routers/orders';
import { sportRouter } from './routers/sport';
import { cityAdminsRouter } from './routers/cityAdmins';
import { db } from './db';
import { assertConfig } from './lib/config';
import { stripeWebhookHandler } from './routes/stripeWebhook';
import { checkRateLimit } from './lib/auth';

assertConfig();

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
  organizers: organizersRouter,
  merchant: merchantRouter,
  orders: ordersRouter,
  sport: sportRouter,
  cityAdmins: cityAdminsRouter,
});

export type AppRouter = typeof appRouter;

// ─── Express ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '2.3.0';

app.disable('x-powered-by');
app.set('trust proxy', 1);

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
    return callback(new Error('Origine non autorisée'));
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
  // L'API ne renvoie que du JSON : aucune page ne doit pouvoir l'afficher ou l'encadrer.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Limite globale par adresse IP, en plus des limites propres à chaque action (connexion,
// inscription…) : protège la base contre un robot ou une boucle d'appels d'un client défectueux.
const GLOBAL_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE) || 600;
app.use('/api/trpc', (req, res, next) => {
  if (checkRateLimit(`global:${req.ip || 'unknown'}`, GLOBAL_LIMIT_PER_MINUTE, 60 * 1000)) return next();
  res.setHeader('Retry-After', '60');
  return res.status(429).json({ error: 'Trop de requêtes, réessayez dans une minute.' });
});

// Webhook Stripe : corps BRUT obligatoire (signature calculée sur les octets exacts).
// Cette route doit rester AVANT express.json().
app.post('/webhooks/stripe', express.raw({ type: 'application/json', limit: '256kb' }), stripeWebhookHandler);

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
    // Une requête = une action : empêche d'empiler des dizaines d'appels dans une seule requête.
    allowBatching: false,
    onError({ path, error }) {
      // Pas de payload, token ou donnée personnelle dans les logs.
      console.error(JSON.stringify({
        level: 'error',
        scope: 'trpc',
        path: path || 'unknown',
        code: error.code,
        message: error.message,
      }));
    },
  })
);

// Prêt à servir : vérifie aussi la base. À utiliser pour la surveillance externe (UptimeRobot…).
app.get('/ready', async (_req, res) => {
  try {
    await Promise.race([
      db.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    res.json({ ok: true, database: 'ok' });
  } catch {
    res.status(503).json({ ok: false, database: 'indisponible' });
  }
});

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

// DEBUG — schema inspector : STRICTEMENT réservé au développement local.
if (process.env.NODE_ENV === 'development') {
  app.get('/api/schema/:table', async (req, res) => {
    try {
      const safeTable = req.params.table;
      if (!/^[A-Za-z0-9_]+$/.test(safeTable)) {
        return res.status(400).json({ error: 'Nom de table invalide' });
      }
      const [rows] = await db.execute(`DESCRIBE \`${safeTable}\``);
      return res.json(rows);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// Origine web refusée par CORS : réponse 403 courte, sans pile d'appels dans les journaux.
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.message === 'Origine non autorisée') {
    console.warn(JSON.stringify({ level: 'warn', scope: 'cors', origin: req.headers.origin || null }));
    return res.status(403).json({ error: 'Origine non autorisée' });
  }
  return next(err);
});

const server = app.listen(PORT, () => {
  console.log(`🏙️  VilleConnect API ${VERSION} running on port ${PORT}`);
  console.log(`✅  tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});

// Protection contre les connexions lentes ou abandonnées (slowloris) ; keepAlive supérieur
// à celui du proxy (Caddy, Railway) pour éviter des erreurs 502 aléatoires.
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 65_000;

// Arrêt propre (redéploiement, redémarrage) : on finit les requêtes en cours avant de couper.
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ level: 'info', scope: 'process', message: `arrêt demandé (${signal})` }));
  server.close(async () => {
    await db.end().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Une promesse rejetée oubliée ne doit pas faire tomber l'API : on la journalise.
process.on('unhandledRejection', reason => {
  console.error(JSON.stringify({ level: 'error', scope: 'process', message: 'unhandledRejection', detail: String((reason as any)?.message || reason) }));
});
// Une exception non rattrapée laisse le processus dans un état incertain : on journalise et on
// quitte ; Docker (restart: unless-stopped) ou Railway relance l'API immédiatement.
process.on('uncaughtException', error => {
  console.error(JSON.stringify({ level: 'fatal', scope: 'process', message: error.message }));
  process.exit(1);
});
