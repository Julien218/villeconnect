# Migration de VilleConnect OS vers un serveur IONOS

Ce guide déplace l'API et la base MySQL de Railway vers un VPS IONOS, sans couper le service et
sans forcer les citoyens à réinstaller l'application.

## 1. Ce qui bouge, ce qui reste

| Élément | Aujourd'hui | Après | Pourquoi |
|---|---|---|---|
| API Node / tRPC (`server/`) | Railway, service `villeconnect` | **IONOS** (Docker) | coût |
| Base MySQL 8 (1,2 Go) | Railway, service `MySQL` | **IONOS** (Docker, non exposée sur Internet) | coût |
| HTTPS | Railway | **Caddy** sur IONOS (Let's Encrypt automatique) | inclus |
| Code source, CI | GitHub | **GitHub** (plan gratuit suffisant) | ne rien déplacer |
| App web, sites vitrine | Cloudflare Pages | Cloudflare Pages (gratuit) | ne rien déplacer |
| Photos produits | Cloudflare R2 | Cloudflare R2 | ne rien déplacer |
| Paiement | Stripe Connect | Stripe Connect | changer l'URL du webhook |
| Emails | Resend | Resend | rien à changer |
| Builds mobiles, mises à jour OTA | Expo EAS | Expo EAS | publier une mise à jour avec la nouvelle URL |
| Supabase | **non utilisé par le code** | à résilier | voir la section 7 |

## 2. Serveur à commander

Un **VPS Linux** IONOS sous **Ubuntu 24.04**, avec au moins 2 vCPU, 4 Go de RAM et 80 Go de SSD, dans un
centre de données européen. Mesures Railway sur 7 jours : l'API utilise environ 40 Mo de RAM et MySQL
environ 475 Mo, pour 1,2 Go de données. Un petit VPS suffit largement.

Choisir le centre de données **Allemagne ou France** (RGPD) et activer les sauvegardes IONOS si l'option
est proposée.

## 3. Principe : passer d'abord par votre propre domaine

Les applications installées appellent aujourd'hui `villeconnect-production.up.railway.app`. On ne peut pas
rediriger ce nom vers IONOS. On procède donc en deux temps :

1. **Avant la migration** : l'API Railway répond aussi sur `api.villeconnectos.com`, et tous les clients
   passent à cette adresse.
2. **Jour de la migration** : on change seulement l'enregistrement DNS `api.villeconnectos.com` vers IONOS.
   Aucun client n'a besoin de changer.

### Étape A : domaine personnalisé sur Railway (1 à 2 semaines avant)

1. Railway → projet VilleConnect → service `villeconnect` → Settings → Networking → *Custom Domain* :
   `api.villeconnectos.com`. Railway indique un enregistrement CNAME à créer.
2. Chez votre gestionnaire DNS (Cloudflare) : créer ce CNAME en mode **DNS only** (nuage gris).
3. Vérifier : `node deploy/ionos/smoke-test.mjs https://api.villeconnectos.com`.
4. Remplacer `https://villeconnect-production.up.railway.app` par `https://api.villeconnectos.com` dans :
   - `macommune-app/shared/api-client.ts` (valeur par défaut)
   - `macommune-app/eas.json` (profil `production`)
   - `public/landing.html`, `public/commerce.html`
   - `cloudflare-landing-deploy/index.html`, `cloudflare-landing-deploy/commerce.html`
   - `functions/getEvents.ts`, `functions/submitEvent.ts` (portail Base44, voir section 8)
5. Republier l'app web (`npm run deploy:web`) et les sites, puis publier une **nouvelle version mobile**
   (`npx eas build --profile production`, puis envoi dans les stores). Les versions déjà installées ne
   peuvent pas recevoir de mise à jour OTA : leurs builds n'avaient pas de canal EAS. Le profil
   `production` en a désormais un (`"channel": "production"`), donc les prochaines builds pourront être
   mises à jour avec `npx eas update --channel production`.
6. Stripe → Développeurs → Webhooks : changer l'URL du webhook Connect en
   `https://api.villeconnectos.com/webhooks/stripe`. Le secret `whsec_` reste le même.
7. Attendre une à deux semaines. Les journaux Railway (requêtes HTTP par domaine) indiquent quand
   l'ancienne adresse n'est presque plus appelée.

## 4. Préparer le serveur IONOS (sans couper Railway)

Sur le VPS, en SSH :

```bash
# Sécurité de base
apt update && apt upgrade -y
apt install -y ufw fail2ban git
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable

# Docker
curl -fsSL https://get.docker.com | sh

# Code
git clone https://github.com/Julien218/villeconnect.git /opt/villeconnect
cd /opt/villeconnect/deploy/ionos
cp .env.example .env && chmod 600 .env
nano .env
```

Dans `.env`, recopier les valeurs du service Railway `villeconnect` (onglet Variables). Garder le **même**
`JWT_SECRET` et le **même** `CITY_HASH_SALT`, sinon les citoyens sont déconnectés. Générer deux mots de
passe MySQL avec `openssl rand -hex 24`.

Les variables Railway `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_OAUTH_SERVER_URL`, `OAUTH_SERVER_URL`,
`OWNER_OPEN_ID` et `VITE_APP_ID` ne sont lues nulle part dans le code : ne pas les recopier.

Premier test, avec un nom provisoire (ex. `api-new.villeconnectos.com` → IP du VPS, en DNS only) :

```bash
# API_DOMAIN=api-new.villeconnectos.com dans .env pour ce test
docker compose --env-file .env up -d --build
docker compose logs -f api
```

## 5. Jour de la migration (environ 30 minutes)

Choisir une heure creuse (ex. 6 h du matin). Les mesures Railway montrent un trafic très faible.

1. **Geler Railway** : arrêter le service `villeconnect` dans Railway (menu du dernier déploiement →
   *Remove*), pour qu'aucune nouvelle donnée n'arrive pendant la copie. Ne pas toucher au service `MySQL`.
2. **Exporter la base Railway** depuis le VPS. Prendre `MYSQL_PUBLIC_URL` dans les variables du service
   Railway `MySQL` (activer le *TCP Proxy* si besoin) :
   ```bash
   docker run --rm -e SRC="<MYSQL_PUBLIC_URL>" mysql:8.0 sh -c '
     u=${SRC#mysql://}; cred=${u%@*}; hp=${u#*@}; hp=${hp%/*}; db=${u##*/}
     mysqldump -h ${hp%:*} -P ${hp#*:} -u ${cred%:*} -p"${cred#*:}" \
       --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF "$db"' \
     > /root/railway-$(date +%F).sql
   ls -lh /root/railway-*.sql
   ```
3. **Importer sur IONOS** :
   ```bash
   cd /opt/villeconnect/deploy/ionos
   docker compose --env-file .env up -d mysql
   docker compose --env-file .env exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" villeconnect' \
     < /root/railway-$(date +%F).sql
   ```
4. **Comparer** le nombre de lignes des tables principales (`users`, `commerce_catalog`, `events`,
   `products`, `shop_orders`) entre Railway et IONOS :
   ```bash
   docker compose --env-file .env exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" villeconnect -e "
     SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM commerce_catalog) commerces,
            (SELECT COUNT(*) FROM events) events, (SELECT COUNT(*) FROM products) produits"'
   ```
5. Mettre `API_DOMAIN=api.villeconnectos.com` dans `.env`, puis démarrer :
   `docker compose --env-file .env up -d --build`.
6. **DNS** : remplacer le CNAME `api.villeconnectos.com` (Railway) par un enregistrement **A** vers l'IP du
   VPS, toujours en DNS only. Caddy obtient le certificat HTTPS tout seul en une minute environ.
7. **Vérifier** : `node deploy/ionos/smoke-test.mjs https://api.villeconnectos.com` doit afficher 11/11.
   Puis, à la main : connexion dans l'app, liste des commerces, agenda, et un paiement test Stripe.
8. Stripe → Webhooks → *Envoyer un événement test* : il doit arriver en 200.

**Retour arrière** si quelque chose ne va pas : remettre le CNAME vers Railway et relancer le service
Railway. Tant que Railway n'est pas supprimé, revenir en arrière prend cinq minutes.

## 6. Après la migration

- **Sauvegardes** : `crontab -e`, puis ajouter
  `15 3 * * * /opt/villeconnect/deploy/ionos/backup.sh >> /var/log/villeconnect-backup.log 2>&1`.
  Copier aussi les sauvegardes hors du serveur (Cloudflare R2 ou stockage IONOS S3). Tester une
  restauration une fois.
- **Mises à jour de l'API** :
  `cd /opt/villeconnect && git pull && cd deploy/ionos && docker compose --env-file .env up -d --build`.
- **Nouvelles migrations SQL** : après sauvegarde, et avant de déployer l'API qui les utilise :
  `docker compose --env-file .env exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" villeconnect' < ../../server/src/migrations/0XX_….sql`
- **Pages légales** : dans `site-villeconnectos/mentions-legales.html` et `confidentialite.html`,
  remplacer Railway par « IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Allemagne ». Mettre aussi à jour
  `docs/architecture/PRODUCT_OPERATIONS.md`.
- **Supprimer Railway** seulement après deux semaines sans incident, en gardant le dernier export SQL.
  Si d'anciennes versions de l'app (qui appellent encore l'adresse `up.railway.app`) restent nombreuses,
  garder d'ici là le service Railway en simple relais vers IONOS plutôt que de le supprimer.

## 7. Où partent vraiment les coûts

Constats faits sur le compte Railway et dans le code (novembre 2026) :

- **Railway (180 $/mois)** : le compte contient **32 projets**. Le projet VilleConnect est minuscule
  (API ≈ 40 Mo de RAM, MySQL ≈ 475 Mo). L'essentiel de la facture vient donc des **autres projets**. Passer
  VilleConnect seul sur IONOS fera baisser la facture d'une petite partie seulement. Il faut faire le tri
  dans les autres projets (beaucoup portent des noms générés automatiquement, comme `brilliant-perception`,
  `humorous-freedom` ou `focused-stillness`) ou les migrer aussi sur le même VPS.
  Dans le projet VilleConnect, `villeconnect-staging` et `MySQL-staging` n'ont aucun déploiement, et
  `vc-migration-check` tourne encore : à supprimer s'il ne sert plus.
- **Supabase (25 $/mois)** : aucune ligne du code VilleConnect n'utilise Supabase. La base est MySQL sur
  Railway. Vérifier dans le tableau de bord Supabase qu'aucun autre projet ne s'en sert, puis résilier.
- **GitHub (25 $/mois)** : le dépôt et la CI fonctionnent sur le plan gratuit (dépôts privés illimités,
  2 000 minutes d'Actions par mois). Vérifier ce qui est facturé (Copilot, plan Team, sièges) dans
  GitHub → Settings → Billing. Garder le code sur GitHub : le VPS fait `git pull` depuis GitHub.

## 8. Portail événements Base44

`public/events-portal.html` et `public/villeconnectos-landing.html` passent encore par des fonctions
Base44 (`functions/*.ts`). `submitEvent.ts` envoie vers `/api/events/submit` et `getEvents.ts` lit
`/api/events`, deux adresses qui **n'existent pas** dans l'API (elle n'expose que `/api/trpc/...`). Les
événements proposés par ce portail ne parviennent donc jamais à VilleConnect. Il faudrait faire appeler
directement `events.submit` et `events.list` par le portail, comme `public/commerce.html` le fait pour
`commerce.submit`, puis abandonner Base44.
