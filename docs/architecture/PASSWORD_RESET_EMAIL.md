# Courriel de réinitialisation — diagnostic du 27 octobre 2026

## Cause confirmée

Le service Railway `villeconnect`, environnement `production`, utilise une valeur de type `mk_…` comme `WEB_APP_URL`. Cette variable doit contenir `https://app.villeconnectos.com`. La concaténation dans `server/src/lib/auth.ts` produisait donc une URL relative inutilisable. Le code et la configuration de production ont été inspectés en lecture seule ; le commit déployé correspondait au HEAD initial `0bd4c65b486185e660c4699bc44dcbecfca229e9`.

Le dernier message de réinitialisation consulté dans Resend, daté du 27 octobre à 13:01 UTC, contient **du HTML et du texte**. Le HTML comporte déjà un `<a href>`, mais son href commence par cette mauvaise valeur. Le texte contient la même adresse incorrecte. Le signalement de texte brut ne prouve donc pas un envoi uniquement textuel ; le client destinataire ou la conversion lors de la copie du message reste à vérifier. Aucun token de ce message n'a été conservé dans le dépôt, les aperçus ou le rapport, et aucun lien réel de réinitialisation n'a été ouvert.

Resend : `villeconnectos.com` vérifié, envoi activé, DKIM et SPF vérifiés, suivi des clics et ouvertures désactivé. Aucun élément ne pointe vers une réécriture par le suivi Resend. L'application fournit le contenu directement ; ce message n'utilise pas un modèle hébergé Resend.

## Correction

- URL construite avec `URL` et `searchParams`, token encodé puis href échappé pour le HTML.
- Origine HTTPS absolue exigée en production : pas de chemin, identifiants, paramètres, fragment, adresse IP ou domaine local. HTTP uniquement sur loopback hors production. La valeur invalide n'apparaît jamais dans l'erreur.
- Avec Resend activé, une configuration de production absente ou invalide bloque le démarrage. La protection est aussi appliquée au moment de l'envoi, qui retourne `false` sans divulguer l'existence du compte.
- Véritable lien HTML présenté comme bouton ; deuxième lien avec URL visible ; version texte fournie explicitement, conformément aux champs `html` et `text` de l'[API Resend](https://resend.com/docs/api-reference/emails/send-email).
- Logo officiel servi depuis `https://villeconnectos.com/brand/logo-villeconnect-official.png`. Palette du manifeste et de la Bible : `#060B18`, `#0B1330`, `#0047FF`, `#00E5FF`, `#0A2D5E`. Poppins avec replis Arial/Helvetica : aucune police distante nécessaire, son affichage effectif dépend du client email.
- Tables de présentation, styles intégrés, largeur fluide limitée à 600 px, wrapper Outlook, bouton d'au moins 44 px, titre et langue, texte alternatif, contrastes AA. Pas de script ni formulaire.
- Expiration conservée à 30 minutes, stockage hashé et rejet des tokens expirés/utilisés inchangés. Réponse publique identique compte connu/inconnu. Les liens de vérification email utilisent également le constructeur sûr et conservent 24 heures.
- Réponses détaillées Resend et messages d'exception réseau retirés des logs d'envoi, car ils peuvent contenir des données confidentielles. Délai réseau maximal de 10 secondes.

## Vérifications

- `npm ci --ignore-scripts` puis `npm run validate` : compilation et **85/85 tests** réussis, dont 27 nouveaux tests ciblés. Exécution locale sous Node 24.16.0 ; image de production sous Node 20, CI existante sous Node 20.19.4. La CI doit confirmer les résultats sur ce runtime.
- Le test existant sur les prix des commandes échouait sous Windows parce que sa recherche utilisait uniquement LF. Normalisation CRLF/LF ajoutée dans ce test ; aucune logique de commande modifiée.
- Envoi simulé : payload JSON effectivement soumis à `fetch`, versions HTML et texte, route, destinataire, erreurs HTTP/réseau, configuration invalide et absence de secrets dans les logs. Aucun email envoyé à un destinataire réel.
- Rendu Chromium automatisé : bureau 800 px, mobile 320 px, mobile sans images 375 px, préférence sombre 375 px. Clic intercepté localement, absence de débordement, logo chargé, contrastes >= 4,5:1. Aperçus bureau/mobile inspectés visuellement.
- Adresses publiques vérifiées : page `/reset-password` HTTP 200 (sans token), logo HTTP 200 image/png, API `/health` HTTP 200. Un HTTP 200 ne constitue pas une preuve de réinitialisation complète.
- Limite : pas de réception native Gmail/Outlook/iOS testée. Le contrôle du mode sombre Chromium ne reproduit pas les transformations propres aux clients email. Prévoir une recette dans ces clients avec un nouveau token de test, après autorisation d'envoi.

Pour reproduire les aperçus après compilation : `node scripts/preview-auth-email.cjs <dossier-sortie>`, depuis `server`, avec Playwright disponible dans l'outillage local. Aucun ajout de dépendance de production. Les aperçus utilisent exclusivement un token marqué `DEMONSTRATION-NON-VALIDE` ; les clics du contrôle sont interceptés localement.

## Conditions avant production — aucun déploiement effectué

1. Faire approuver et appliquer la correction Railway `WEB_APP_URL=https://app.villeconnectos.com` avec le changement de code. La valeur actuelle demeure incorrecte tant qu'elle n'est pas changée. Cette variable sert aussi aux retours Stripe : vérifier ces parcours lors de la recette. Ne pas mettre l'URL du backend Railway à sa place.
2. Staging : `WEB_APP_URL` est absente alors qu'une clé Resend est présente. Définir l'origine réelle du frontend de staging avant de déployer ce changement en mode production sur staging ; ne pas deviner cette adresse ni rediriger silencieusement les tests vers la production.
3. Audit `npm audit --omit=dev` : **2 vulnérabilités élevées préexistantes**, `body-parser` et `zod`. Le correctif proposé pour zod implique une version majeure. Aucune mise à jour automatique appliquée : prévoir une correction dédiée avec tests de compatibilité. Le contrôle de sécurité CI peut rester bloquant.
4. Le service Railway suit `main`, racine `server`, Dockerfile `server/Dockerfile`, démarrage `node dist/index.js`. Le Dockerfile actuel utilise `npm install` sans copier le verrou : la construction de production n'est pas strictement reproductible. Prévoir la vérification du verrou et des dépendances avant mise en production. Aucune migration SQL requise pour ce changement.
5. Attendre les contrôles GitHub puis valider en staging et dans Gmail/Outlook/mobile, sans journaliser ni publier de token réel. Après un éventuel déploiement autorisé, demander un nouveau lien et vérifier son utilisation et son expiration ; ne jamais réutiliser celui signalé.

La production, les variables Railway, les domaines Resend, les données et les droits n'ont pas été modifiés. Aucun déploiement, fusion ou envoi d'email réel effectué.
