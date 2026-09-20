# Base44 development notes

- The active frontend is `macommune-app` (Expo Router). `App.tsx` is an unused starter; `/` resolves to `app/(tabs)/index.tsx`. Static landing pages under `public` and `cloudflare-landing-deploy` are separate from this app.
- Use `docker compose -f docker-compose.base44.yml up -d`. Source is mounted, Metro runs on port 3000, and the API recompiles with TypeScript watch and restarts via Node watch on port 8000. No published application images are used.
- API connections use the existing `EXPO_PUBLIC_API_URL` configuration and bearer tokens, not cross-site cookies. Compose sets the public preview CORS origin dynamically. Managed secrets are loaded only by the API from `/run/base44/app.env`.
- Startup was checked with HTTP `/` on port 3000 and `/health` on 8000. Metro can log a missing desktop DevTools shared library in this headless container; the web server still starts.
- Provisioning is not yet complete: the local MySQL database is empty. The repository's migrations begin at 007 and later migrations depend on legacy tables (`users`, `shops`, `events`, CivicLoop tables) whose original schema is absent. Obtain the original schema before applying dependent migrations; do not fabricate production data or silently point the preview at production. Data-backed screens are not verified.
- `ControlCenterModal` and its `NetworkLines` exist but are not imported by any mounted screen. The current floating C button opens the Wallet, not the hexagonal control centre. Restoring that navigation requires user approval; don't change it for an animation-only request.
- Backend validation: `docker compose -f docker-compose.base44.yml exec -T api npm run validate`. Frontend typecheck: `docker compose -f docker-compose.base44.yml exec -T web npx tsc --noEmit`.
- Nested `macommune-app/AGENTS.md` requires reading the versioned Expo documentation before editing its code.
