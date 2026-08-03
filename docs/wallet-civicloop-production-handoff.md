# Remise production — Wallet CivicLoop

## Périmètre du lot

Ce lot transforme le Wallet en carte de fidélité CivicLoop et ajoute un flux sécurisé d’utilisation des récompenses :

- carte recto/verso et actions rapides ;
- ville active issue du profil citoyen ;
- initialisation atomique du Wallet et du bonus de bienvenue ;
- réservation idempotente d’une récompense ;
- débit transactionnel des crédits ;
- jeton temporaire signé, valable dix minutes ;
- QR Model 2 généré localement dans l’application, sans service tiers ;
- annulation avec remboursement transactionnel ;
- confirmation réservée au commerçant autorisé pour la boutique ;
- historique paginé par curseur ;
- CI frontend et backend.

## Branche et Pull Request

- Branche : `chore/wallet-loyalty-foundation`
- Pull Request : `#2`
- Cible : `main`
- Ne pas déployer directement en production avant la recette staging.

## Variables obligatoires

Ajouter dans l’environnement Railway du service API :

- `WALLET_QR_SECRET` : secret aléatoire dédié d’au moins 32 octets ;
- `JWT_SECRET` : doit rester défini, mais ne doit servir de repli que temporairement.

Le secret QR doit être différent entre staging et production. Ne jamais l’exposer dans le client Expo, les logs ou les réponses API autres que le pass temporaire destiné à l’utilisateur authentifié.

## Migration SQL

Appliquer, dans cet ordre, sur la base staging :

1. vérifier que les migrations précédentes sont présentes ;
2. exécuter `server/src/migrations/010_reward_redemptions.sql` ;
3. vérifier les tables `merchant_shops` et `reward_redemptions` ;
4. associer au moins un compte commerçant de test à une boutique dans `merchant_shops` ;
5. ne jamais utiliser un compte citoyen comme commerçant de test.

La migration est idempotente grâce à `CREATE TABLE IF NOT EXISTS`, mais son application doit tout de même être journalisée par l’agent de production.

## Recette staging obligatoire

### Citoyen

1. Se connecter avec un compte dont l’adresse e-mail est vérifiée.
2. Ouvrir le Wallet et vérifier la carte, le solde, la commune et le palier.
3. Réserver une récompense dont le coût est inférieur au solde.
4. Vérifier qu’un seul débit apparaît dans `civic_transactions`.
5. Répéter la même requête avec la même clé d’idempotence et confirmer qu’aucun second débit n’est créé.
6. Scanner le QR affiché avec deux appareils différents et vérifier que les deux récupèrent exactement le jeton `vc1...` attendu.
7. Tester le QR en thème clair, sombre, sur web et sur mobile, avec une luminosité normale et réduite.
8. Annuler la réservation et vérifier le remboursement intégral.
9. Réserver à nouveau et laisser expirer le pass ; vérifier le remboursement lors de l’annulation automatique côté client ou lors de la tentative de validation.

### Commerçant

1. Se connecter avec un rôle `merchant`, `admin` ou `super_admin`.
2. Vérifier l’association active dans `merchant_shops`.
3. Confirmer un jeton valide pour la bonne boutique.
4. Rejouer la confirmation et vérifier l’idempotence.
5. Essayer depuis une boutique non autorisée et vérifier le refus.
6. Essayer avec un jeton modifié ou expiré et vérifier le refus.
7. Vérifier que le scanner n’envoie jamais le jeton à une API QR tierce.

### Régression

- validation d’une mission ;
- affichage de l’historique ;
- fusion Wallet invité vers compte ;
- changement de ville dans le profil ;
- thème clair et sombre ;
- export web et navigation mobile.

## Contrôles avant fusion

- CI GitHub verte sur le dernier commit ;
- aucun secret dans le diff ;
- migration testée sur une copie ou la base staging ;
- compte commerçant de test correctement lié ;
- CORS staging limité aux domaines nécessaires avant ouverture publique ;
- sauvegarde ou point de restauration MySQL disponible ;
- QR décodé avec succès sur les navigateurs et appareils ciblés ;
- validation fonctionnelle du pass temporaire sur web et mobile.

## Génération QR locale

Le composant `macommune-app/components/secure-qr.tsx` génère localement un QR Model 2 version 6, niveau de correction L, adapté au format ASCII des jetons CivicLoop. Il s’appuie uniquement sur `react-native-svg`, déjà présent et verrouillé dans le projet.

Aucune valeur n’est envoyée à un service de génération externe. Le QR contient uniquement le jeton temporaire signé `vc1...` ; il ne contient ni nom, ni adresse e-mail, ni solde, ni identifiant utilisateur directement exploitable.

## Déploiement recommandé

1. Déployer l’API sur Railway staging.
2. Appliquer la migration 010 sur MySQL staging.
3. Configurer un `WALLET_QR_SECRET` dédié sur staging.
4. Déployer l’application web en preview/staging.
5. Exécuter la recette complète, dont le scan réel du QR.
6. Fusionner la Pull Request uniquement après validation.
7. Déployer l’API production et appliquer la migration.
8. Configurer un autre `WALLET_QR_SECRET` en production.
9. Déployer le frontend production.
10. Surveiller erreurs API, débits, annulations et confirmations pendant les premières heures.

## Rollback

En cas de problème fonctionnel :

- désactiver temporairement les récompenses via `rewards.is_active = 0` ;
- revenir au déploiement API précédent ;
- conserver les tables et les écritures d’audit ;
- ne pas supprimer les échanges déjà confirmés ;
- rembourser uniquement les échanges `pending` après vérification transactionnelle.

Le rollback ne doit jamais recréditer une récompense déjà `confirmed` sans procédure métier explicite.
