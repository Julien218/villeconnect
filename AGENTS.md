# Base44 — VilleConnect OS

## Architecture

Fullstack app with three compose services plus MySQL 8:

| Service  | Image   | Role                                      | Internal port | Host port |
|----------|---------|-------------------------------------------|---------------|-----------|
| `db`     | mysql:8 | MySQL 8 database                           | 3306          | —         |
| `migrate`| mysql:8 | One-shot: applies all `server/src/migrations/*.sql` (skips `*ROLLBACK*`) | — | — |
| `api`    | node:20 | Express + tRPC API (`ts-node` dev)         | 3000          | 8000      |
| `web`    | node:20 | Expo web dev server (Metro)               | 8081          | 3000      |

The web app (Expo) is the user-facing entry point on host port 3000. The API is on host port 8000. The app calls the API via `EXPO_PUBLIC_API_URL` (set to the API's public URL in compose).

## Startup

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Migrations run automatically as a one-shot service before the API starts. The `000_base_schema.sql` is idempotent and creates the base tables; migrations 007–018 add the rest.

## Secrets

Three secrets are delivered via `/run/base44/app.env` (wired into the `api` service):
- `JWT_SECRET` — required at boot (≥32 chars, no placeholder)
- `CITY_HASH_SALT` — required in production only
- `WALLET_QR_SECRET` — used by retired wallet router

The API's `assertConfig()` (server/src/lib/config.ts) exits the process if `JWT_SECRET` is missing or a placeholder.

## Sandbox-specific overrides

1. **`macommune-app/app.config.js`** — gated on `BASE44_PREVIEW_MODE === "1"`: adds `extra.router.origin` from `EXPO_PUBLIC_WEB_APP_URL` so Expo's `CorsMiddleware` allows the preview origin. Without this, the dev server rejects the bundle request and the app shows a blank page. Hors sandbox, the file is transparent (returns app.json config unchanged).

2. **`docker-compose.base44.yml`** — passes `CORS_ORIGINS` and `WEB_APP_URL` as the preview public URLs, and `EXPO_PUBLIC_API_URL` to the web service. The `--host lan` flag is required (Expo rejects `0.0.0.0`).

## Known non-fatal warnings

- `libnspr4.so` missing in the `web` container: React Native DevTools can't install, but Metro bundler works fine.
- Peer dependency warnings about `expo-router@58` vs `expo-constants@57`: nested dependency mismatch from `npm audit fix`, does not affect the build.

## Verification

- API health: `curl http://localhost:8000/health` → `{"ok":true,...}`
- API tRPC: `curl "http://localhost:8000/api/trpc/events.list?input=%7B%22json%22%3A%7B%22limit%22%3A5%7D%7D"`
- Web: `curl http://localhost:3000/` → HTML with Expo Router bundle
- Preview: the app renders the home screen (hero, services grid, commerce section, bottom nav)
