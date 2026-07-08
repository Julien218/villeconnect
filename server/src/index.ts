// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Backend API Server (tRPC v11 + Express)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { router, createContext } from './trpc';
import { shopsRouter } from './routers/shops';
import { eventsRouter } from './routers/events';
import { fuelRouter } from './routers/fuel';
import { walletRouter } from './routers/wallet';
import { alertsRouter } from './routers/alerts';
import { authRouter } from './routers/auth';
import { waitlistRouter } from './routers/waitlist';
import { db } from './db';

// ─── App Router ───────────────────────────────────────────
export const appRouter = router({
  shops: shopsRouter,
  events: eventsRouter,
  fuel: fuelRouter,
  wallet: walletRouter,
  alerts: alertsRouter,
  auth: authRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;

// ─── Express ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'VilleConnect API', version: '2.0.1', ts: new Date().toISOString() });
});

// tRPC handler
app.use(
  '/api/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => createContext(req),
  })
);

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
      const [rows] = await db.execute(`DESCRIBE \`${req.params.table}\``);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}

app.listen(PORT, () => {
  console.log(`🏙️  VilleConnect API running on port ${PORT}`);
  console.log(`✅  tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});
