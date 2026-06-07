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

// ─── App Router ───────────────────────────────────────────
export const appRouter = router({
  shops: shopsRouter,
  events: eventsRouter,
  fuel: fuelRouter,
  wallet: walletRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;

// ─── Express ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'VilleConnect API', version: '2.0.0', ts: new Date().toISOString() });
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
    version: '2.0.0',
    endpoints: {
      health: '/health',
      trpc: '/api/trpc',
      docs: 'https://villeconnect-production.up.railway.app',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🏙️  VilleConnect API running on port ${PORT}`);
  console.log(`✅  tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});

// DEBUG — schema inspector (temporary)
app.get('/api/schema/:table', async (req, res) => {
  try {
    const { db: dbPool } = require('./db');
    const [rows] = await dbPool.execute(`DESCRIBE \`${req.params.table}\``);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
