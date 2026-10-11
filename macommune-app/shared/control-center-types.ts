// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Centre de Contrôle : types partagés (favoris, états visuels, actions radiales).
import type { Ionicons } from '@expo/vector-icons';

export type HexVisualState =
  | 'normal'        // contour bleu standard
  | 'notification'  // petit point lumineux
  | 'new'           // halo cyan (nouveau contenu)
  | 'urgent'        // halo orange (urgence)
  | 'error'         // halo rouge (erreur)
  | 'syncing'       // contour animé (synchronisation en cours)
  | 'favorite';     // étoile discrète

export interface ModuleDef {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  colorKey: string; // clé dans theme.colors.modules
}

export interface FavoriteItem extends ModuleDef {
  state: HexVisualState;
}

// Catalogue complet des modules disponibles pour une commune — le moteur ne connaît
// que ce catalogue ; chaque commune peut l'étendre/restreindre sans toucher au coeur
// applicatif (architecture multi-tenant : voir shared/branding.ts).
export const ALL_MODULES: ModuleDef[] = [
  { key: 'actualites',   icon: 'newspaper',            label: 'Actualités',   route: '/(tabs)/events', colorKey: 'actualites' },
  { key: 'agenda',       icon: 'calendar',              label: 'Agenda',       route: '/(tabs)/events', colorKey: 'agenda' },
  { key: 'signalement',  icon: 'warning',               label: 'Signalement',  route: '/(tabs)/index',  colorKey: 'signalement' },
  { key: 'guichet',      icon: 'document-text',         label: 'E-guichet',    route: '/(tabs)/index',  colorKey: 'guichet' },
  { key: 'commerces',    icon: 'storefront',            label: 'Commerces',    route: '/(tabs)/shops',  colorKey: 'commerces' },
  { key: 'promotions',   icon: 'pricetag',              label: 'Promotions',   route: '/(tabs)/shops',  colorKey: 'promotions' },
  { key: 'sport',        icon: 'trophy',                label: 'Sport',        route: '/(tabs)/events?category=Sport', colorKey: 'agenda' },
  { key: 'carburant',    icon: 'flame',                 label: 'Carburant',    route: '/(tabs)/fuel',   colorKey: 'carburant' },
  { key: 'entraide',     icon: 'people',                label: 'Entraide',     route: '/(tabs)/index',  colorKey: 'entraide' },
  { key: 'travaux',      icon: 'construct',             label: 'Travaux',      route: '/(tabs)/index',  colorKey: 'commune' },
  { key: 'associations', icon: 'people-circle',         label: 'Associations', route: '/(tabs)/index',  colorKey: 'entraide' },
  { key: 'bus',          icon: 'bus',                   label: 'Bus',          route: '/(tabs)/index',  colorKey: 'carburant' },
  { key: 'sante',        icon: 'medkit',                label: 'Santé',        route: '/(tabs)/index',  colorKey: 'guichet' },
  { key: 'police',       icon: 'shield-checkmark',      label: 'Police',       route: '/(tabs)/index',  colorKey: 'signalement' },
  { key: 'parking',      icon: 'car-sport',             label: 'Parking',      route: '/(tabs)/index',  colorKey: 'commune' },
  { key: 'tourisme',     icon: 'compass',                label: 'Tourisme',     route: '/(tabs)/index',  colorKey: 'promotions' },
  { key: 'ia',           icon: 'sparkles',              label: 'Assistant IA', route: '/(tabs)/index',  colorKey: 'commune' },
  { key: 'commune',      icon: 'location',              label: 'Ma commune',   route: '/(tabs)/index',  colorKey: 'commune' },
];

// Sélection par défaut affichée autour du C tant que l'utilisateur n'a rien personnalisé.
// Uniquement des modules qui ouvrent un vrai écran : les autres restent disponibles dans la
// personnalisation, mais ne sont pas affichés par défaut tant que leur écran n'existe pas.
export const DEFAULT_FAVORITE_KEYS = [
  'actualites', 'agenda', 'commerces', 'sport', 'carburant',
];

export interface RadialAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export const RADIAL_ACTIONS: RadialAction[] = [
  { key: 'ia',           icon: 'sparkles',        label: "Parler à l'IA" },
  { key: 'add-event',    icon: 'calendar',        label: 'Ajouter un événement' },
  { key: 'report',       icon: 'warning',         label: 'Faire un signalement' },
  { key: 'scan',         icon: 'qr-code',         label: 'Scanner un QR Code' },
  { key: 'search-shop',  icon: 'search',          label: 'Rechercher un commerce' },
  { key: 'favorites',    icon: 'star',            label: 'Mes favoris' },
  { key: 'settings',     icon: 'settings',        label: 'Paramètres' },
];
