# 🚀 Guide de mise en production — VilleConnect

## 1. Base de données MySQL

### Option A — MySQL local (dev)
```bash
# Créer la DB
mysql -u root -p -e "CREATE DATABASE villeconnect_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER 'villeconnect'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON villeconnect_db.* TO 'villeconnect'@'localhost'; FLUSH PRIVILEGES;"
```

### Option B — PlanetScale / Neon (prod recommandée)
- Créer un compte sur [PlanetScale](https://planetscale.com) (MySQL compatible)
- Créer une base `villeconnect`
- Copier la connection string → `DATABASE_URL`

## 2. Variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

## 3. Créer les tables (Drizzle)

```bash
pnpm install
DATABASE_URL="mysql://..." pnpm drizzle-kit push
```

✅ Toutes les tables sont créées automatiquement :
- `users`, `shops`, `shop_products`, `garages`, `garage_services`
- `events`, `event_reminders`, `dci_requests`, `dci_offers`
- `communal_alerts`, `appointments`, `push_tokens`, `postal_codes`

## 4. Lancer en dev

```bash
pnpm dev       # Lance frontend Expo + backend tRPC simultanément
```

## 5. Insérer les données initiales (optionnel)

```bash
# Via Drizzle Studio
DATABASE_URL="mysql://..." pnpm drizzle-kit studio
```

## 6. Push Notifications (Expo)

Les tokens push sont enregistrés automatiquement depuis l'app mobile via :
```
trpc.notifications.registerToken.mutate({ token, platform })
```

Pour les alertes communales en broadcast :
```ts
import { notifyNewAlert } from "@/server/_core/notification";
await notifyNewAlert({ title: "Alerte", message: "...", postalCode: "7370" });
```

## 7. Déploiement

### Recommandé : Railway.app
```bash
# Variables à définir sur Railway :
DATABASE_URL=mysql://...
JWT_SECRET=...
OWNER_OPEN_ID=...
NODE_ENV=production
```

### Alternative : Fly.io, Render, Hetzner + Docker

## Architecture finale

```
VilleConnect App
├── Expo (mobile iOS/Android)
├── Next.js (web — optionnel)
├── tRPC server (Express)
│   ├── /api/trpc → tous les routers
│   └── /oauth/callback
├── MySQL (via Drizzle ORM)
├── Expo Push Notifications
└── AsyncStorage (local cache)
```

## Checklist production

- [ ] `DATABASE_URL` configuré
- [ ] `pnpm drizzle-kit push` exécuté
- [ ] `JWT_SECRET` généré (min 32 chars)
- [ ] Build Expo (`eas build`)
- [ ] Première alerte communale de test envoyée
- [ ] Test login avec code postal 7370 (Dour)
