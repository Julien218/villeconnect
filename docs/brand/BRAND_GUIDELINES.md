# Bible visuelle VilleConnect OS

Version : 1.0 — août 2026  
Propriétaire : Js-Innov.IA — Julien Pagin

## 1. Positionnement visuel

VilleConnect OS est une interface civic-tech premium : fiable, locale, intelligente et immédiatement identifiable. L’ADN de référence est le visuel mobile bleu nuit fourni au projet : ville nocturne connectée, lumière cyan, surfaces vitrées et modules géométriques.

L’interface ne doit jamais ressembler à un tableau de bord administratif générique. Elle doit conserver une hiérarchie simple, une profondeur maîtrisée et une forte lisibilité.

## 2. Logo

Assets officiels disponibles dans le dépôt :

- `public/brand/logo-villeconnect-official.png`
- `public/logo-villeconnect-official.webp`
- assets applicatifs sous `macommune-app/assets/images/`

Règles :

- conserver les proportions du logo ;
- ne jamais l’étirer, l’incliner ou modifier ses couleurs ;
- maintenir une zone libre minimale égale à 20 % de sa largeur ;
- utiliser un fichier transparent sur fond sombre ;
- ne pas placer le logo sur une zone visuellement chargée sans surface de protection ;
- les variantes locales (`DourConnect`, `FrameriesConnect`, etc.) utilisent le même symbole et une dénomination textuelle distincte.

## 3. Palette principale

| Rôle | Valeur | Usage |
|---|---:|---|
| Fond profond | `#030817` | arrière-plan principal sombre |
| Fond secondaire | `#071329` | sections et navigation |
| Surface | `#0D1B3D` | cartes et panneaux |
| Bleu primaire | `#0060FF` | actions principales, focus |
| Cyan signal | `#00E5FF` | accents, états actifs, connectivité |
| Turquoise succès | `#00D7AE` | validation et succès |
| Texte principal | `#F8FBFF` | titres et contenus prioritaires |
| Texte secondaire | `#AEBAD0` | descriptions et métadonnées |
| Avertissement | `#FFC857` | attention non bloquante |
| Erreur | `#FF6B86` | erreurs et actions destructives |

Les couleurs cyan et bleu ne doivent pas être utilisées sur de longues zones de texte. Elles servent aux accents, icônes, focus et appels à l’action.

## 4. Typographie

- Police produit : **Poppins**.
- Titres : 700 à 800.
- Corps : 400 à 500.
- Libellés et badges : 700, capitales limitées, espacement de lettres léger.
- Taille minimale recommandée : 14 px pour le texte fonctionnel, 12 px pour une métadonnée secondaire.

Le texte doit rester compréhensible sans jargon technique. Une action doit utiliser un verbe explicite : « Envoyer la demande », « Réserver », « Réessayer ».

## 5. Formes et profondeur

- Cartes : rayons de 16 à 28 px selon la taille.
- Boutons : 12 à 16 px ou forme pilule pour les actions globales.
- Bordures : 1 px, cyan ou blanc à faible opacité.
- Ombres : diffuses et modérées ; aucun halo ne doit réduire la lisibilité.
- Glassmorphism : réservé aux cartes importantes, toujours avec un fond suffisamment opaque.
- Les modules hexagonaux du visuel de référence peuvent être utilisés comme signature graphique, mais pas comme unique affordance interactive.

## 6. Icônes

- Bibliothèque applicative : Ionicons.
- Trait homogène et taille cohérente dans une même zone.
- Toujours fournir un libellé ou une étiquette d’accessibilité pour une icône interactive.
- Ne pas utiliser d’emoji comme icône métier en production.

## 7. Navigation

- Cinq destinations principales maximum visibles simultanément sur mobile.
- L’action centrale peut recevoir le traitement lumineux du logo, mais doit rester identifiable comme bouton.
- L’onglet actif utilise cyan + libellé ; les autres restent en texte secondaire.
- Les écrans secondaires utilisent un retour clair et ne créent pas un nouvel onglet permanent.

## 8. États obligatoires

Chaque liste, écran connecté ou formulaire doit prévoir :

- chargement ;
- succès ;
- état vide ;
- erreur réseau ;
- absence de permission ;
- action en cours ;
- confirmation ou annulation.

Aucune donnée fictive ne doit remplacer silencieusement une erreur réseau.

## 9. Formulaires

- Libellé visible pour chaque champ ; le placeholder ne remplace pas le libellé.
- Champs obligatoires clairement indiqués.
- Validation côté client et côté serveur.
- Message d’erreur proche de l’action et annoncé via `aria-live` sur le web.
- Bouton désactivé pendant l’envoi.
- Consentement non précoché et finalité explicitée.

## 10. Accessibilité

Cible minimale : WCAG 2.2 niveau AA pour le web et équivalent mobile.

- contraste suffisant ;
- zones tactiles d’au moins 44 × 44 px ;
- parcours clavier complet sur le web ;
- focus visible ;
- prise en charge de la réduction des animations ;
- textes redimensionnables ;
- libellés VoiceOver/TalkBack pour les actions.

## 11. Responsive

- Mobile : priorité aux actions et informations essentielles.
- Tablette : grilles de deux colonnes lorsque la lecture le permet.
- Desktop : largeur de contenu maîtrisée, généralement 1080 à 1200 px.
- Aucun texte incrusté dans une image ne doit porter une information indispensable.

## 12. Gouvernance

Toute nouvelle interface doit :

1. utiliser les tokens existants ;
2. réutiliser les composants partagés ;
3. être testée en thème sombre et clair lorsqu’un thème clair existe ;
4. être vérifiée sur mobile et web ;
5. documenter toute nouvelle couleur ou variante ;
6. éviter les variations locales non validées du logo.

La présente bible est la référence fonctionnelle. Les planches graphiques et visuels fournis restent la référence artistique lorsqu’une règle n’est pas encore formalisée ici.
