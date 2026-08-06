# VilleConnect OS — Architecture et exploitation

Version de travail : août 2026  
Branche de finalisation : `agent/villeconnect-product-finish`

## 1. Vue générale

VilleConnect OS est composé de quatre surfaces partageant la même API et la même base MySQL :

1. application citoyenne Expo / React Native sous `macommune-app/` ;
2. API Node.js / Express / tRPC sous `server/` ;
3. landing statique et portail commerce sous `public/` ;
4. distribution Cloudflare de la landing sous `cloudflare-landing-deploy/`.

La source de vérité des commerces est `commerce_catalog`. Une demande publique est toujours créée avec :

```text
validation_status = pending
publication_status = draft
```

Elle n’apparaît dans l’application qu’après approbation puis publication humaine.

## 2. Technologies

- Node.js 20 ;
- TypeScript ;
- Express ;
- tRPC v11 ;
- Zod ;
- MySQL 8 ;
- Expo / React Native / Expo Router ;
- GitHub Actions ;
- Railway pour l’API et MySQL ;
- Cloudflare pour la landing lorsque ce déploiement est activé ;
- Resend / Amazon SES pour les emails lorsque la clé est configurée.

## 3. Installation locale

### API

```bash
cd server
cp .env.example .env
npm ci
npm run build
npm test
npm run dev
```

### Application mobile

```bash
cd macommune-app
cp .env.example .env
npm ci
npx tsc --noEmit
npx expo start
```

Pour un test sur appareil réel, préférer un development build. Expo Go ne garantit pas la prise en charge de toutes les dépendances natives.

## 4. Variables d’environnement

### API

| Variable | Requise | Description |
|---|---:|---|
| `DATABASE_URL` | oui | connexion MySQL 8 de l’environnement ciblé |
| `JWT_SECRET` | oui | signature des jetons d’accès ; valeur distincte par environnement |
| `WALLET_QR_SECRET` | oui | signature HMAC des QR CivicLoop, distincte du JWT |
| `CITY_HASH_SALT` | oui | salage des empreintes de confidentialité et anti-abus |
| `CORS_ORIGINS` | oui en production | origines web autorisées, séparées par des virgules |
| `RESEND_API_KEY` | selon emails | clé Resend, jamais versionnée |
| `WEB_APP_URL` | selon emails | URL utilisée dans les liens de vérification et reset |
| `NODE_ENV` | oui | `development`, `staging` ou `production` selon la convention retenue |
| `PORT` | automatique Railway | port d’écoute |

### Expo

| Variable | Requise | Description |
|---|---:|---|
| `EXPO_PUBLIC_API_URL` | oui | API ciblée par ce build |
| `EXPO_PUBLIC_WEB_APP_URL` | selon usage | URL web officielle |
| `EXPO_PUBLIC_ANDROID_APP_URL` | après publication | lien Play Store réel |
| `EXPO_PUBLIC_IOS_APP_URL` | après publication | lien App Store réel |

Les profils EAS `development` et `preview` ciblent staging. Seul `production` cible l’API production.

## 5. Migrations

Migrations ajoutées ou consolidées par le chantier :

- `010_reward_redemptions.sql` : associations commerçants et échanges QR ;
- `011_commerce_catalog.sql` : catalogue canonique et reprise des commerces historiques actifs ;
- `012_fuel_stations.sql` : prix carburant sourcés, sans données fictives ;
- `013_privacy_requests.sql` : traçabilité des exports et effacements ;
- `014_waitlist_consents.sql` : preuve de consentement de la liste d’attente.

### Procédure obligatoire

1. confirmer le projet et l’environnement Railway ;
2. confirmer que la base est MySQL 8 ;
3. effectuer un vrai `mysqldump` contenant schéma et données ;
4. vérifier le fichier de sauvegarde hors du conteneur éphémère ;
5. appliquer chaque migration une seule fois depuis un contexte d’administration ;
6. vérifier les tables, colonnes, contraintes et index ;
7. effectuer les tests fonctionnels ;
8. conserver la procédure de restauration.

Aucune migration ne doit être exécutée dans la commande de démarrage de l’API.

## 6. Commandes de validation

### Backend

```bash
cd server
npm ci
npm run validate
```

`validate` compile TypeScript puis exécute les tests Node.

### Application

```bash
cd macommune-app
npm ci
npx tsc --noEmit
npm run build:web
npx expo-doctor
```

### CI

La workflow `.github/workflows/ci.yml` exécute :

- installation propre avec `npm ci` ;
- TypeScript Expo ;
- export web Expo ;
- build TypeScript du backend ;
- tests backend.

## 7. Rôles et permissions

- `citizen` : compte citoyen ;
- `merchant` : accès commerçant, limité aux boutiques associées dans `merchant_shops` ;
- `city_admin` : modération du territoire autorisé ;
- `admin` / `super_admin` : administration globale selon les procédures tRPC.

Les routes sensibles utilisent `protectedProcedure`, `merchantProcedure`, `cityAdminProcedure` ou `adminProcedure`.

## 8. Flux principaux

### Wallet CivicLoop

1. initialisation atomique du wallet et bonus unique ;
2. réservation transactionnelle avec clé d’idempotence ;
3. débit sous verrou ;
4. génération d’un QR HMAC temporaire ;
5. validation par le commerçant autorisé pour la boutique ;
6. annulation ou expiration avec remboursement exactement une fois ;
7. confirmation idempotente.

### Commerce

1. formulaire public ;
2. validation Zod, consentement et honeypot ;
3. déduplication SHA-256 canonique ;
4. statut `pending/draft` ;
5. examen administrateur ;
6. statut `approved/published` ;
7. lecture automatique par l’application.

### Événements

Les événements publics sont uniquement ceux au statut `approved`. Les coordonnées privées des organisateurs ne sont accessibles qu’aux administrateurs autorisés.

### Carburant

Aucun prix n’est inventé. Une station est visible uniquement avec une source, un horodatage et un prix valide. Le fournisseur réel de données reste à contractualiser et alimenter.

## 9. RGPD et confidentialité

Fonctionnalités techniques présentes :

- consentement explicite sur la liste d’attente et le portail commerce ;
- journal de consentement ;
- export JSON depuis le profil ;
- effacement avec réauthentification et confirmation forte ;
- anonymisation des identifiants directs ;
- révocation des sessions ;
- conservation séparée du grand livre CivicLoop ;
- page publique `privacy.html`.

Ces éléments ne remplacent pas la validation humaine des bases légales, durées, sous-traitants, contrats, coordonnées du responsable et procédure de violation de données.

## 10. Sauvegarde et restauration

### Sauvegarde

Exemple à adapter dans un contexte sécurisé :

```bash
mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF "$DATABASE_URL" > villeconnect-YYYYMMDD-HHMM.sql
```

Ne jamais afficher l’URL ou le mot de passe dans les logs. Chiffrer et stocker le dump hors du conteneur Railway.

### Vérification

```bash
 test -s villeconnect-YYYYMMDD-HHMM.sql
 grep -q "CREATE TABLE" villeconnect-YYYYMMDD-HHMM.sql
```

### Restauration

La restauration doit être testée sur une base jetable avant toute intervention réelle. Une procédure de rollback ne peut pas être déclarée validée sans ce test.

## 11. Déploiement

### Staging

- branche explicitement choisie ;
- checks GitHub activés ;
- variables staging distinctes ;
- migrations après sauvegarde ;
- health check HTTP 200 ;
- recette sur appareil et navigateur ;
- aucun secret dans les logs.

### Production

Une fusion ou un déploiement production nécessite une autorisation explicite. Après déploiement :

- confirmer le commit déployé ;
- vérifier `/health` ;
- tester les routes publiques ;
- tester l’authentification ;
- consulter les logs et métriques ;
- vérifier HTTPS et domaines ;
- documenter le résultat.

## 12. Maintenance

Tâches périodiques à mettre en place :

- purge des jetons expirés ;
- revue des comptes privilégiés ;
- rotation des secrets ;
- tests de restauration ;
- analyse des dépendances ;
- revue des rapports DMARC ;
- revue des consentements et durées de conservation ;
- contrôle des sources carburant ;
- vérification des liens communaux.

## 13. Limitations connues

- migrations 011 à 014 non encore validées sur Railway staging ;
- absence actuelle d’un fournisseur réel de prix carburant ;
- recette QR sur appareils cibles encore nécessaire ;
- tests E2E complets avec MySQL staging non encore exécutés ;
- mentions légales et politique de confidentialité à valider juridiquement ;
- développement d’un scanner commerçant dédié à confirmer selon le parcours opérationnel ;
- tests de charge, audit d’intrusion et restauration réelle à planifier.
