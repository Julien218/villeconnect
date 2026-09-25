# Protection de VilleConnect

## Périmètre et limites

Ce durcissement n'est ni un audit d'intrusion exhaustif, ni une certification de sécurité.
Les changements sont dans la branche de travail ; ils ne modifient pas Railway,
Cloudflare ni les réglages GitHub du propriétaire.

Protections ajoutées :
- les identifiants invités ne donnent plus accès aux comptes email, comptes privilégiés,
  désactivés ou fusionnés, y compris avec un ancien jeton d'appareil ;
- les permissions et l'état du compte sont relus en base à chaque procédure protégée ;
- validation stricte du type, de l'identité et de l'algorithme JWT ;
- limitation supplémentaire du login par IP et de la création de sessions invitées ;
- refus des prises de compte concurrentes lors de la conversion d'un invité ;
- suppression de l'inspecteur de schéma HTTP, masquage des erreurs internes ;
- exclusion Git des secrets et sauvegardes ; propositions de mises à jour Dependabot.

Les jetons d'accès expirent après 15 minutes. La réinitialisation du mot de passe
révoque les refresh tokens, mais pas encore les JWT d'accès déjà émis pendant cette
fenêtre. Le stockage natif des refresh tokens, les courses sur les jetons à usage
unique, la preuve de possession des anciens identifiants invités et la portée
territoriale des administrateurs communaux nécessitent un chantier complémentaire.
Ne pas considérer le mode invité historique comme une authentification forte.

## Vérifications effectuées

- 19 tests backend réussis et compilation TypeScript de l'application réussie.
- Tests HTTP locaux : connexion invité, connexion par mot de passe et profil personnel
  fonctionnels ; accès invité à un compte, ancien jeton invité, historique de compte
  public et accès administrateur citoyen refusés ; limite de connexion maintenue
  malgré un en-tête de forwarding initial falsifié ; inspecteur de schéma absent.
- Sauvegarde chiffrée, checksum, reclonage Git et restauration MySQL de 26 tables
  vérifiés sur un clone et une base jetables ; refus d'un dépôt modifié vérifié.
  Les clés et archives de test ont été supprimées : aucune sauvegarde durable créée.
- Après mises à jour compatibles : aucune vulnérabilité signalée par npm audit côté
  serveur ; trois alertes modérées subsistent sur la chaîne decode-uri-component /
  query-string / expo-router. Pas de vulnérabilité élevée restante signalée.
  Le correctif automatique proposé rétrograde le routeur de manière incompatible :
  ne pas l'appliquer avec `--force` sans migration et tests dédiés.
- Vérification navigateur non effectuée automatiquement : aucun onglet d'aperçu
  accessible lors du test. Le serveur et la compilation web répondent normalement.

## Actions du propriétaire sur GitHub

À activer/vérifier dans les réglages du dépôt (non modifiés automatiquement) :
1. Visibilité **Private**, revue des collaborateurs et moindre privilège.
2. Authentification à deux facteurs ou passkeys, codes de récupération hors ligne.
3. Ruleset sur la branche principale : PR obligatoire, approbation, checks CI requis,
   interdiction de suppression et de force-push ; limiter les exemptions.
4. Dependabot alerts/security updates, secret scanning et push protection si disponibles.
5. Après fusion, vérifier la prise en compte de `.github/dependabot.yml`.

`.gitignore` n'efface pas les secrets déjà présents dans l'historique : toute clé
exposée doit être révoquée puis remplacée. Ne jamais mettre de secret dans une
variable `EXPO_PUBLIC_*`, une issue publique, une capture ou le chat.

## Protection contre la copie

La notice `LICENSE` réserve les droits sur le code original et préserve les licences
tierces (notamment Expo). Faire valider sa portée et les droits des contributeurs.
Le code livré au navigateur ou à un téléphone reste récupérable : ni obfuscation,
ni blocage du clic droit, ni watermark ne rendent la copie impossible. Garder les
algorithmes sensibles et les secrets côté serveur ; limiter l'accès au dépôt et ne
pas distribuer les sources/sourcemaps de production. Les serveurs de développement
exposent des sources par conception : ne pas utiliser cet aperçu comme production
et ne pas en diffuser l'accès pour protéger la confidentialité du code.
Aucun dépôt de marque ou démarche juridique n'a été effectué.

## Sauvegarde manuelle chiffrée — environnement local uniquement

Prérequis sur une machine de confiance : Bash, Git, Docker Compose, tar, GnuPG,
sha256sum. La clé publique de chiffrement doit être importée et son empreinte
vérifiée ; la clé privée doit rester sauvegardée séparément, hors du projet.

```bash
BACKUP_RECIPIENT=<empreinte-publique-GPG> bash scripts/backup-project.sh /stockage-prive/villeconnect
```

Le script exige un dépôt propre et inclut : historique Git et toutes les branches
connues localement, schéma et données de MySQL **Base44 local**, commit et date.
Il n'inclut pas les fichiers non suivis, les secrets gérés hors du dépôt, les objets
Git LFS externes, les pièces jointes distantes, ni les données Railway/Cloudflare.
Il ne fait ni commit, ni fetch, ni push et n'écrase pas une sauvegarde existante.
Les données transitoires sont supprimées à la fin ; employer un disque temporaire
chiffré pour des données réelles (suppression logique ≠ effacement physique garanti).

Copier les archives chiffrées vers un stockage hors de cet environnement. Un volume
Docker, GitHub seul, ou un dossier du sandbox ne constitue pas une sauvegarde hors site.
Aucune planification ni copie hors site n'est activée : destination, clé et rétention
restent à choisir. Proposition à confirmer : sauvegarde quotidienne, conservation
30 jours, test de restauration mensuel et alerte en cas d'échec.

### Test de restauration isolé (jamais sur une base existante)

1. Vérifier `sha256sum -c <archive>.sha256` depuis le dossier de sauvegarde.
2. Sur une machine de confiance, déchiffrer vers un répertoire temporaire privé :
   `gpg --output /dossier-prive/archive.tar.gz --decrypt <archive>.tar.gpg`.
   Vérifier le succès du déchiffrement **avant** extraction ; ne pas diffuser l'archive en clair.
3. Extraire l'archive, puis `git clone project.bundle /dossier-neuf/villeconnect`.
   Vérifier le commit avec `manifest.txt` ; les branches sont disponibles dans le bundle.
4. Démarrer une instance MySQL 8 jetable séparée. Créer une base vide puis importer
   `database.sql` via `mysql -h <hote-test> -u <utilisateur-test> -p <base-test> < database.sql`.
   Ne jamais utiliser un mot de passe en argument ou la base de production.
5. Comparer tables et lignes, vérifier `/health`, connexion et données métier.
6. Supprimer l'instance jetable et les fichiers déchiffrés après validation.

Pour Railway : configurer des sauvegardes du service réel et un export chiffré hors
site avec un compte dédié ; une URL MySQL ne se passe pas directement à mysqldump.
Faire confirmer la cible et tester la restauration avant toute migration.

## Exploitation

Configurer `TRUST_PROXY_HOPS=0` en accès direct ; une valeur non nulle n'est sûre
que si les proxies de confiance réécrivent X-Forwarded-For et si les chemins directs
sont bloqués. Valider la topologie Railway avant de changer cette valeur en production.
Les limiteurs mémoire couvrent une instance : utiliser Redis ou une passerelle
commune avant de multiplier les instances. Ne pas exposer MySQL publiquement.

Les migrations initiales de production ne sont pas dans ce dépôt. Le fichier
`.base44/bootstrap.sql` est une base de développement inférée, sans données réelles,
pas une migration de production. Les emails Resend restent indisponibles sans clé.

En cas de vulnérabilité, contacter le propriétaire par un canal privé ; ne pas
ouvrir de ticket public avec identifiants, preuves nominatives ou secrets.
