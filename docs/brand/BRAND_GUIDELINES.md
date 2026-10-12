# Bible visuelle VilleConnect OS

Version : 1.1 — 23 septembre 2026  
Propriétaire : Js-Innov.IA — Julien Pagin  
Statut : **production / aligné sur les planches ADN et le design system runtime**

## 1. Positionnement visuel

VilleConnect OS est une interface civic-tech premium : fiable, locale, intelligente et immédiatement identifiable. L’ADN de référence est la ville nocturne connectée, la lumière cyan, les surfaces vitrées et les modules géométriques.

L’interface ne doit jamais ressembler à un tableau de bord administratif générique. Elle conserve une hiérarchie simple, une profondeur maîtrisée et une forte lisibilité.

### Ordre d’autorité
1. `docs/brand/brand.manifest.json`
2. la présente Bible
3. `macommune-app/shared/theme.ts` pour les tokens runtime
4. `macommune-app/shared/branding.ts` pour la déclinaison locale
5. les planches graphiques validées pour les décisions artistiques non encore formalisées

La palette précédemment documentée avec `#030817`, `#0060FF`, `#00D7AE` est retirée comme palette canonique : elle décrivait une variante UI et entrait en conflit avec les tokens officiels du design system.

## 2. Logo

Assets officiels disponibles dans le dépôt :

- `brand-assets/villeconnect-os-logo-official.png`
- `public/brand/logo-villeconnect-official.png`
- `public/logo-villeconnect-official.webp`
- `macommune-app/assets/logo-official.png`
- `macommune-app/assets/logo-official-small.png`

Règles :
- conserver les proportions du logo ;
- ne jamais l’étirer, l’incliner ou modifier ses couleurs ;
- maintenir une zone libre minimale égale à 20 % de sa largeur ;
- utiliser un fichier transparent sur fond adapté ;
- ne pas placer le logo sur une zone chargée sans surface de protection ;
- les variantes locales (`DourConnect`, `FrameriesConnect`, etc.) utilisent le même symbole et une dénomination textuelle distincte ;
- ne jamais générer ou redessiner le logo avec une IA.

## 3. Palette officielle de marque

Source : `macommune-app/shared/theme.ts`, explicitement documentée comme ADN officiel des planches clair/foncé.

| Rôle | Valeur | Usage |
|---|---:|---|
| Navy marque | `#0A2D5E` | logo, titres / gradient de marque |
| Bleu primaire | `#0047FF` | actions principales, focus |
| Cyan accent | `#00E5FF` | connectivité, signal lumineux |
| Teal / succès | `#00BFA5` | validation, succès |
| Gris neutre | `#AEB6C1` | métadonnées |
| Fond clair | `#F5F7FA` | thème clair |
| Blanc | `#FFFFFF` | surfaces / texte sur fond sombre |

### Tokens de surface — thème sombre
- Fond profond : `#060B18`
- En-tête : `#0B1330`
- Surface pleine : `#101935`
- Gradient navy secondaire : `#132352`

### Tokens de surface — thème clair
- Fond profond : `#F5F7FA`
- En-tête / surface : `#FFFFFF`
- Texte principal : `#0A2D5E`

Les couleurs secondaires des modules (agenda, carburant, signalement, etc.) sont fonctionnelles et ne deviennent pas des couleurs de marque.

## 4. Typographie

- Police produit : **Poppins**.
- Titres : 700 à 800.
- Corps : 400 à 500.
- Libellés et badges : 700, capitales limitées, espacement léger.
- Taille minimale recommandée : 14 px pour le texte fonctionnel, 12 px pour une métadonnée secondaire.

Le texte doit rester compréhensible sans jargon technique. Une action utilise un verbe explicite : « Envoyer la demande », « Réserver », « Réessayer ».

## 5. Formes et profondeur

- Cartes : rayons de 16 à 28 px selon la taille.
- Boutons : 12 à 16 px ou forme pilule pour les actions globales.
- Bordures : 1 px, cyan ou blanc à faible opacité.
- Ombres : diffuses et modérées ; aucun halo ne doit réduire la lisibilité.
- Glassmorphism : réservé aux cartes importantes, avec un fond suffisamment opaque.
- Les modules hexagonaux peuvent être utilisés comme signature graphique, mais jamais comme unique affordance interactive.

## 6. Icônes

- Bibliothèque applicative : Ionicons.
- Trait homogène et taille cohérente dans une même zone.
- Toujours fournir un libellé ou une étiquette d’accessibilité pour une icône interactive.
- Ne pas utiliser d’emoji comme icône métier en production.

## 7. Navigation

- Cinq destinations principales maximum visibles simultanément sur mobile.
- L’action centrale peut recevoir le traitement lumineux du logo, mais reste identifiable comme bouton.
- L’onglet actif utilise cyan + libellé ; les autres restent en texte secondaire.
- Les écrans secondaires utilisent un retour clair et ne créent pas un nouvel onglet permanent.

## 8. États obligatoires

Chaque liste, écran connecté ou formulaire prévoit : chargement, succès, état vide, erreur réseau, absence de permission, action en cours, confirmation/annulation. Aucune donnée fictive ne remplace silencieusement une erreur réseau.

## 9. Formulaires

- Libellé visible pour chaque champ ; le placeholder ne remplace pas le libellé.
- Champs obligatoires clairement indiqués.
- Validation côté client et côté serveur.
- Message d’erreur proche de l’action et annoncé via `aria-live` sur le web.
- Bouton désactivé pendant l’envoi.
- Consentement non précoché et finalité explicitée.

## 10. Accessibilité

Cible minimale : WCAG 2.2 AA pour le web et équivalent mobile.
- contraste suffisant ;
- zones tactiles d’au moins 44 × 44 px ;
- parcours clavier complet ;
- focus visible ;
- réduction des animations ;
- textes redimensionnables ;
- libellés VoiceOver/TalkBack.

## 11. Responsive

- Mobile : priorité aux actions et informations essentielles.
- Tablette : grilles de deux colonnes lorsque pertinent.
- Desktop : largeur de contenu généralement 1080 à 1200 px.
- Aucun texte incrusté dans une image ne porte une information indispensable.

## 12. Gouvernance multi-ville

`VilleConnect OS` est la plateforme. `DourConnect`, `FrameriesConnect`, etc. sont des instances locales.

Une déclinaison locale peut modifier le nom de ville, les contenus, les services et certains visuels territoriaux, mais ne doit pas :
- modifier le symbole principal ;
- inventer une nouvelle palette de marque sans validation ;
- remplacer Poppins comme police produit ;
- fusionner le logo communal avec le logo VilleConnect hors lockup validé ;
- introduire les assets d’une autre marque JS-Innov.IA.

Toute nouvelle interface doit utiliser les tokens existants, les composants partagés, être testée clair/sombre, mobile/web et documenter toute nouvelle variante.
