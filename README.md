# VilleConnect OS

Plateforme locale qui réunit citoyens, commerçants et communes. **Dour (7370)** est la ville de départ. Les autres communes sont ajoutées progressivement, sans développement spécifique.

© 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.

## Contenu du dépôt

| Dossier | Rôle |
|---|---|
| `macommune-app/` | Application citoyenne (Expo / React Native, web, iOS, Android) |
| `server/` | API Node.js, Express, tRPC et MySQL 8 |
| `public/`, `cloudflare-landing-deploy/` | Site vitrine et portails (commerces, événements) |
| `docs/` | Architecture, charte graphique, exploitation (`docs/architecture/PRODUCT_OPERATIONS.md`) |

Les dossiers `villeconnect-civicloop/`, `villeconnect-push/` et `villeconnect-protection/` sont des modules **non branchés** à l'application actuelle.

## Fonctionnement actuel de l'application

Accueil, actualités et agenda, annuaire des commerces, prix des carburants, profil, services communaux. Les comptes citoyens utilisent email et mot de passe.

Le Wallet et la carte de fidélité sont **retirés** de l'application. Le code serveur correspondant reste dans `server/src/routers/wallet.ts` mais n'est plus appelé par l'app.

## Démarrage local

```bash
# API
cd server
cp .env.example .env      # puis renseigner les valeurs
npm ci
npm run validate          # compile et lance les tests
npm run dev

# Application
cd macommune-app
cp .env.example .env
npm ci
npx tsc --noEmit
npx expo start
```

## Configuration obligatoire du serveur

Le serveur **refuse de démarrer** si la configuration est dangereuse (voir `server/src/lib/config.ts`).

| Variable | Règle |
|---|---|
| `JWT_SECRET` | au moins 32 caractères aléatoires, différent par environnement |
| `DATABASE_URL` | connexion MySQL 8 |
| `CITY_HASH_SALT` | obligatoire en production, au moins 32 caractères |
| `CORS_ORIGINS` | obligatoire en production |

## Déploiement progressif des villes

Dour est la ville active. Pour les autres communes, le mécanisme existe déjà dans l'API (`server/src/routers/city.ts`) :

1. un citoyen connecté signale sa commune (`city.registerCityInterest`) ;
2. si la commune n'existe pas, elle est créée automatiquement avec le statut `pending_validation` ;
3. aux seuils de 1, 5, 10, 25 et 50 citoyens, une invitation par email à la commune est mise en file, si une adresse officielle est connue ;
4. au plus un contact tous les 30 jours par commune ;
5. la commune passe à `contacted` à l'envoi. Le passage à `verified` se fait côté administration (aucun écran dédié pour l'instant).

Aucune donnée citoyenne n'est exposée publiquement : seul le nombre agrégé est utilisé.

## D'où viennent les événements

Trois sources, une seule règle de publication :

| Source | Fonctionnement |
|---|---|
| **ASBL, commune, commerces** | Elles créent un compte, puis l'administrateur les rattache à une fiche organisateur (`organizers.adminUpsert`). Elles publient avec `events.submitAsOrganizer`. |
| **Organisateur de confiance** | Si sa fiche est marquée `trusted` et que l'email de son compte est vérifié, l'événement est publié immédiatement. |
| **Proposition publique** (portail, sans compte) | `events.submit` : l'événement reste `pending` jusqu'à validation par un administrateur. |

La commune est traitée comme un organisateur de type `commune`. Le rôle `city_admin` n'est pas limité à sa commune dans le code actuel : ne l'attribuer qu'à des personnes de confiance tant que ce cloisonnement n'existe pas.

## Sécurité : points d'attention connus

- Les limitations de débit sont **en mémoire** : elles conviennent à une seule instance. Passer à Redis avant d'ajouter des instances.
- Les migrations numérotées **001 à 006** (tables `users`, `shops`, `events`, etc.) ne sont pas dans le dépôt : la base ne peut pas être recréée depuis zéro à partir des fichiers actuels.
- Appliquer les migrations manuellement, après sauvegarde, jamais au démarrage de l'API.

## Prochaines étapes prévues

Commerçants en libre-service, produits et commandes avec retrait en commerce, paiement Bancontact via Stripe Connect avec commission de 5 %, rubrique Sport, écran d'administration.
