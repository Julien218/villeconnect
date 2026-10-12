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

Accueil, actualités et agenda, annuaire des commerces avec vitrine et commande en ligne (retrait ou livraison), rubrique Sport, prix des carburants, profil, services communaux. Les comptes citoyens utilisent email et mot de passe.

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

### Import automatique d'un calendrier (.ics)

Quand une commune ou une ASBL publie un agenda au format iCal (`.ics`), VilleConnect peut le lire à intervalles réguliers (`server/src/lib/eventFeedSync.ts`).

- **À n'utiliser qu'avec l'accord de la source.** Ne rien importer depuis un site sans autorisation ; le scraping de pages web n'est volontairement pas prévu.
- Les événements importés restent `pending` (validation) sauf si le flux est marqué « publier sans validation ». Une fiche déjà validée ou refusée n'est jamais écrasée par la source.
- Les doublons sont évités par `(source_feed_id, source_uid)`. Les événements récurrents ne sont importés que pour leur première occurrence.
- Sécurité : `https` obligatoire, adresses internes refusées (y compris après résolution DNS), pas de redirection suivie, 1 Mo maximum, 10 secondes maximum.
- Mise en route : appliquer la migration `019_event_feeds.sql` (après sauvegarde), puis ajouter un flux depuis le profil d'un administrateur (« Flux d'événements »). La synchronisation automatique (toutes les 6 h) s'active avec `EVENT_FEED_SYNC=1` ; sinon utiliser « Synchroniser maintenant ».
- Les flux RSS ne sont pas pris en charge : ils donnent la date de publication d'un article, pas la date de l'événement.

### Pages officielles de la commune (E-guichet, Travaux)

Sur l'accueil, les modules E-guichet et Travaux ouvrent les liens officiels de la commune enregistrés dans `city_service_links` (types `eguichet` et `works`, `https` uniquement). Sans lien enregistré, l'accueil affiche Services et Carburant à leur place. Aucune donnée de la commune n'est copiée.

## Commandes, retrait en commerce et paiement

Les citoyens commandent chez un commerce, paient en ligne (Bancontact ou carte) et retirent leur commande avec un code. VilleConnect garde **5 %** (`PLATFORM_FEE_PERCENT`), le reste va directement au commerçant.

**Principe** : Stripe Connect, comptes *Standard*, paiements directs. L'argent est encaissé par le compte Stripe du commerçant, qui garde la main sur ses remboursements et litiges. VilleConnect ne reçoit que la commission, prélevée automatiquement. La commission est retirée de la part du commerçant, jamais ajoutée au prix payé par le client.

**Parcours**
1. L'administrateur rattache le compte d'un commerçant à son commerce (`merchant.adminLinkMember`).
2. Le commerçant relie son compte Stripe (`merchant.startPaymentOnboarding`), puis crée ses produits (`merchant.productSave`).
3. Le citoyen commande (`orders.create`) : le serveur recalcule tout, le client n'envoie jamais de prix. Il est redirigé vers la page de paiement Stripe.
4. Stripe confirme par webhook (`POST /webhooks/stripe`, signature vérifiée) : la commande passe à `paid` et le code de retrait devient visible.
5. Le commerçant prépare (`preparing`, `ready`) puis saisit le code du client (`merchant.confirmPickup`) : `collected`.

**Règles** : commande minimale 10 € (`MIN_ORDER_CENTS`), maximum 5 000 €, email vérifié obligatoire, montants en centimes entiers. Une commande payée ne s'annule pas dans l'app : le commerçant la rembourse dans son tableau de bord Stripe.

**Mise en route (une seule fois)**
1. Créer un compte Stripe, activer Connect (comptes Standard, pays : Belgique).
2. Renseigner `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `WEB_APP_URL` (voir `server/.env.example`).
3. Créer un webhook **Connect** (« événements des comptes connectés ») vers `https://<api>/webhooks/stripe` pour : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `account.updated`.
4. Chaque commerçant doit activer Bancontact dans son propre compte Stripe.
5. **Tester entièrement avec les clés `sk_test_` avant tout argent réel.**

**Livraison à domicile** (migration `017_delivery.sql`) : chaque commerçant l'active dans `/pro/<id>` → onglet Livraison (frais, livraison offerte dès un montant, codes postaux livrés). Le client choisit « Retrait » ou « Livraison » au panier et indique son adresse et son téléphone. Le commerçant livre lui-même ; à la remise, le client donne son code au livreur, qui le saisit comme pour un retrait. Les frais de livraison vont entièrement au commerçant : la commission de 5 % porte uniquement sur les produits, et le minimum de commande ne compte pas les frais.

**Écrans de l'app** : vitrine et panier (`/commerce/<id>`), « Mes commandes » (`/orders`), espace commerçant (`/pro` : commandes, remise par code, produits, livraison, activation Stripe). Côté événements : `/organizer` (publication par les ASBL et la commune) et `/admin/events` (validation). Ces écrans ont été parcourus dans la version web, sur une base locale de démonstration (voir « Démonstration locale »). Le paiement Stripe lui-même n'a pas encore été testé, faute de clé de test.

**Pas encore fait** : TVA sur la commission, remboursement depuis l'app. Le retour de paiement utilise `WEB_APP_URL` (`/orders/<id>`) : pour l'app native, il faudra un lien universel.

## Rubrique Sport

L'écran `/sport` (tuile « Sport » de l'accueil) regroupe, pour la commune de l'utilisateur :

- les **disciplines** disponibles (filtre) ;
- les **clubs** et les **installations** (salles, terrains), avec public, horaires, tarifs, adresse et boutons Appeler, Email, Site et Itinéraire ;
- les **prochains événements sportifs**, tirés de l'agenda (catégorie `Sport`).

**Gestion légère** (migration `018_sport_places.sql`) : un club connecté propose sa fiche depuis `/sport`, et elle reste en attente. Un administrateur de ville la publie ou la refuse en un clic dans Profil → « Fiches Sport à valider » (`/admin/sport`). Il peut aussi saisir une fiche directement : elle est alors publiée tout de suite. Aucune fiche n'est créée d'office.

## Sécurité : points d'attention connus

- Les limitations de débit sont **en mémoire** : elles conviennent à une seule instance. Passer à Redis avant d'ajouter des instances.
- Les migrations **001 à 006** d'origine ne sont pas dans le dépôt. `000_base_schema.sql` reconstruit leurs tables (`users`, `events`, jetons, `shops`…) d'après les requêtes du serveur, pour créer une base neuve. En production, ces tables existent déjà : ne pas s'en servir pour modifier une base existante sans comparer d'abord avec `DESCRIBE`.
- Appliquer les migrations manuellement, après sauvegarde, jamais au démarrage de l'API.
- **Ordre de mise en production** : appliquer `017_delivery.sql` et `018_sport_places.sql` (après sauvegarde) **avant** de déployer l'API qui les utilise. Sans elles, les commandes et la rubrique Sport renvoient une erreur.

## Démonstration locale

Pour voir l'application complète sur un ordinateur, sans toucher à la production :

1. MySQL 8 local, puis appliquer dans l'ordre `000_base_schema.sql`, puis `007` à `018` (sans les fichiers `_ROLLBACK`).
2. Lancer l'API (`server/`, `npm run build && npm start`) avec un `.env` de développement (`WEB_APP_URL=http://localhost:8090`).
3. Construire l'app web pointée sur cette API : `EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo export --clear --platform web`, puis servir `dist/` avec un repli vers `index.html`.
4. Créer les comptes depuis l'écran d'inscription. Un administrateur rattache le commerçant (`merchant.adminLinkMember`).

Sans clé Stripe, tout fonctionne jusqu'au paiement : la commande est créée, puis annulée avec le message « paiement momentanément indisponible ».

## Prochaines étapes prévues

Tester le paiement de bout en bout avec les clés Stripe de test (`sk_test_`), puis le retour vers l'app native (lien universel).
