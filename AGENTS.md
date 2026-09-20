# Base44 Dev Environment — VilleConnect OS (Ma Commune)

## Architecture
Fullstack app with two processes + MySQL:
- **Frontend** (`macommune-app/`): Expo SDK 57 web app (React Native Web). Served on port 3000 via `npx expo start --web --port 3000`.
- **Backend** (`server/`): Node.js tRPC v11 + Express API. Runs on port 8000 with `node --watch` + ts-node for live reload.
- **Database**: MySQL 8.0 with auto-migrations.

## Key Setup Details
- The repo's original migrations 001–006 are **missing**. `server/src/migrations/000_base_schema.sql` reconstructs the base tables (users, shops, civic_wallets, civic_transactions, missions, events, etc.) by reading the router code. If a router query fails with "table not found", add the missing table/column to `000_base_schema.sql`.
- `015_seed_dev_data.sql` seeds demo data for postal code 7370 (Dour) — missions, rewards, shops, commerce, events, alerts.
- Migration 009 uses `DELIMITER`/stored procedures — must be run via the `mysql` CLI (the `migrate` compose service handles this).
- Migration 011 has `INSERT ... SELECT FROM shops` — the shops table must exist first (created by 000).

## Environment
- `EXPO_PUBLIC_API_URL` is set to the backend's public URL (`https://8000-$BASE44_PUBLIC_HOST_SUFFIX`) and inlined into the JS bundle at build time. If the sandbox host changes, restart the web service.
- CORS: backend allows the frontend origin via `CORS_ORIGINS=https://3000-$BASE44_PUBLIC_HOST_SUFFIX`.
- Secrets: `JWT_SECRET`, `WALLET_QR_SECRET`, `CITY_HASH_SALT` are generated as dev placeholders via `/run/base44/app.env`, with fallbacks in `.env.base44-defaults`.
- `RESEND_API_KEY` is optional — app boots without it but email verification/reset won't work.

## Verify
- `docker compose -f docker-compose.base44.yml up -d --build`
- Backend health: `curl http://localhost:8000/health` → `{"ok":true,...}`
- Frontend: `curl http://localhost:3000` → HTML page
- tRPC endpoint: `curl 'http://localhost:8000/api/trpc/wallet.getMissions?input=%7B%220%22%3A%7B%22postalCode%22%3A%227370%22%7D%7D'`

## Metro Config
`macommune-app/metro.config.js` binds the dev server to `0.0.0.0` so the preview proxy can reach it. Uses `expo/metro-config` getDefaultConfig (preserves tsconfig path aliases for `@/*`).

## Backend Live Reload
Uses `node --watch --require ts-node/register/transpile-only` — no extra dependencies needed. If file watching doesn't fire on bind mounts, restart the api service manually.
