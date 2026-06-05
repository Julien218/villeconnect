# VilleConnect - Design Document

## Vision

VilleConnect est une application citoyenne globale qui transforme chaque ville en une **ville web**. Elle relie citoyens, commerces, garages, artisans et services communaux dans une seule plateforme mobile, conçue pour une utilisation à une main en orientation portrait (9:16).

---

## Palette de Couleurs

| Token | Couleur | Usage |
|-------|---------|-------|
| **Primary** | `#2563EB` (Bleu vif) | Actions principales, boutons CTA |
| **Secondary** | `#059669` (Vert émeraude) | Succès, validations, commerces |
| **Accent** | `#F59E0B` (Orange ambre) | Alertes, promotions, garages |
| **Background** | `#F8FAFC` (Gris très clair) | Fond d'écran principal |
| **Surface** | `#FFFFFF` | Cartes, modales |
| **Foreground** | `#1E293B` (Gris ardoise) | Texte principal |
| **Muted** | `#64748B` | Texte secondaire |
| **Border** | `#E2E8F0` | Bordures, séparateurs |
| **Error** | `#EF4444` | Erreurs |
| **Communal** | `#7C3AED` (Violet) | Espace communal |

---

## Liste des Écrans

### 1. Accueil (Home)
- **Contenu** : Carrousel d'actualités/promotions locales, barre de recherche globale, raccourcis vers les modules principaux (Commerces, Garages, Commune, DCI)
- **Fonctionnalité** : Point d'entrée principal, notifications intelligentes

### 2. Recherche (Search)
- **Contenu** : Barre de recherche avec filtres (commerces, services, événements, aides), résultats catégorisés
- **Fonctionnalité** : Recherche globale multi-catégories

### 3. Commerces (Shops)
- **Contenu** : Liste des vitrines commerçantes par catégorie, filtres, carte
- **Fonctionnalité** : Navigation vers les fiches commerces

### 4. Fiche Commerce (Shop Detail)
- **Contenu** : Vitrine personnalisée, produits/services, horaires, promotions, bouton RDV
- **Fonctionnalité** : Prise de rendez-vous, contact direct

### 5. Garages & Artisans (Garages)
- **Contenu** : Liste des garages et artisans, annonces véhicules, services
- **Fonctionnalité** : Demande de devis, prise de RDV

### 6. Fiche Garage (Garage Detail)
- **Contenu** : Vitrine garage, véhicules en vente, services mécaniques, tarifs
- **Fonctionnalité** : Demande de devis, RDV

### 7. Commune (Municipality)
- **Contenu** : Informations officielles, services pratiques (déchets, sacs poubelles), alertes
- **Fonctionnalité** : Prise de RDV population, assistant administratif

### 8. Démarche Citoyenne (DCI)
- **Contenu** : Formulaire d'expression libre du besoin, historique des demandes
- **Fonctionnalité** : Soumission de demande, réception d'offres, choix libre

### 9. Profil (Profile)
- **Contenu** : Informations personnelles (optionnel), préférences, historique
- **Fonctionnalité** : Gestion du compte, paramètres notifications

---

## Flux Utilisateurs Principaux

### Flux 1 : Recherche d'un commerce
1. Utilisateur ouvre l'app → Écran Accueil
2. Tape dans la barre de recherche "boulangerie"
3. Résultats affichés avec filtres
4. Sélectionne une boulangerie → Fiche Commerce
5. Consulte les produits, horaires
6. Prend RDV ou appelle directement

### Flux 2 : Démarche Citoyenne Intelligente (DCI)
1. Utilisateur va sur l'onglet DCI
2. Exprime son besoin en langage naturel : "J'ai besoin de faire réparer ma voiture"
3. L'app clarifie le besoin (type de réparation, urgence)
4. Distribution aux garages concernés
5. Réception des offres/devis
6. Choix libre du citoyen

### Flux 3 : Services communaux
1. Utilisateur va sur l'onglet Commune
2. Consulte les informations officielles
3. Accède aux services pratiques (calendrier déchets)
4. Prend RDV avec la population
5. Utilise l'assistant administratif pour une démarche

---

## Navigation (Tab Bar)

| Onglet | Icône | Écran |
|--------|-------|-------|
| Accueil | `house.fill` | Home |
| Commerces | `storefront.fill` | Shops |
| DCI | `message.fill` | DCI (Démarche Citoyenne) |
| Commune | `building.columns.fill` | Municipality |
| Profil | `person.fill` | Profile |

---

## Composants Réutilisables

### CarouselBanner
- Carrousel horizontal avec images/texte
- Auto-scroll avec indicateurs de pagination
- Utilisé sur l'écran Accueil

### SearchBar
- Barre de recherche avec icône loupe
- Placeholder contextuel
- Suggestions en temps réel

### ShopCard
- Carte commerce avec image, nom, catégorie, note
- Badge promotion si applicable
- Pressable vers la fiche détail

### GarageCard
- Carte garage avec image, nom, spécialités
- Badge "Véhicules disponibles" si applicable

### ServiceCard
- Carte service communal avec icône, titre, description
- Utilisé dans l'espace Commune

### DCIForm
- Formulaire d'expression libre
- Champ texte multiligne
- Bouton de soumission

### AppointmentButton
- Bouton de prise de RDV
- Intégration agenda

---

## Principes d'Interaction

1. **Feedback haptique** : Vibration légère sur les actions principales
2. **États de chargement** : Skeleton loaders pour les listes
3. **Pull-to-refresh** : Sur toutes les listes
4. **Transitions** : Animations subtiles (fade, slide) entre écrans
5. **Accessibilité** : Contraste suffisant, tailles de texte adaptatives

---

## Données Mock (Phase initiale)

L'application utilisera des données locales (AsyncStorage) avec des données de démonstration pour :
- 5 commerces de différentes catégories
- 3 garages/artisans
- Informations communales fictives
- Historique DCI vide

Pas de backend requis pour cette phase initiale.
