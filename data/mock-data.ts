/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
// Types
export interface Shop {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  image: string;
  hasPromotion: boolean;
  promotionText?: string;
  products?: Product[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Garage {
  id: string;
  name: string;
  specialties: string[];
  description: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  image: string;
  vehiclesCount: number;
  services: GarageService[];
}

export interface GarageService {
  id: string;
  name: string;
  priceRange: string;
}

export interface CommunalService {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

export interface CommunalAlert {
  id: string;
  title: string;
  message: string;
  date: string;
  type: "info" | "warning" | "urgent";
}

export interface DCIRequest {
  id: string;
  description: string;
  status: "pending" | "offers" | "completed";
  date: string;
  offersCount: number;
}

// Mock Data
export const SHOP_CATEGORIES = [
  "Tous",
  "Alimentation",
  "Restaurant",
  "Services",
  "Mode",
  "Santé",
];

export const SHOPS: Shop[] = [
  {
    id: "1",
    name: "Boulangerie du Coin",
    category: "Alimentation",
    description: "Pains artisanaux, viennoiseries fraîches et pâtisseries maison depuis 1985.",
    address: "12 Rue de la Mairie, 1000 Ville",
    phone: "+32 123 456 789",
    hours: "Lun-Sam: 6h30-19h00",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    hasPromotion: true,
    promotionText: "-20% sur les croissants le mardi",
    products: [
      { id: "p1", name: "Pain tradition", price: 2.50, description: "Pain au levain naturel" },
      { id: "p2", name: "Croissant", price: 1.20, description: "Pur beurre" },
      { id: "p3", name: "Éclair chocolat", price: 3.00, description: "Crème pâtissière maison" },
    ],
  },
  {
    id: "2",
    name: "Restaurant Le Terroir",
    category: "Restaurant",
    description: "Cuisine traditionnelle belge avec des produits locaux et de saison.",
    address: "45 Place du Marché, 1000 Ville",
    phone: "+32 123 456 790",
    hours: "Mar-Dim: 12h-14h30, 18h30-22h",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
    hasPromotion: false,
  },
  {
    id: "3",
    name: "Pharmacie Centrale",
    category: "Santé",
    description: "Votre pharmacie de quartier, conseils personnalisés et produits de parapharmacie.",
    address: "8 Avenue de la Gare, 1000 Ville",
    phone: "+32 123 456 791",
    hours: "Lun-Ven: 8h30-18h30, Sam: 9h-13h",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400",
    hasPromotion: true,
    promotionText: "Conseil gratuit nutrition",
  },
  {
    id: "4",
    name: "Boutique Mode & Style",
    category: "Mode",
    description: "Vêtements et accessoires tendance pour femmes et hommes.",
    address: "23 Rue Commerçante, 1000 Ville",
    phone: "+32 123 456 792",
    hours: "Lun-Sam: 10h-18h30",
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400",
    hasPromotion: true,
    promotionText: "Soldes -30% sur la collection hiver",
  },
  {
    id: "5",
    name: "Pressing Express",
    category: "Services",
    description: "Nettoyage à sec, repassage et retouches. Service rapide garanti.",
    address: "67 Rue du Commerce, 1000 Ville",
    phone: "+32 123 456 793",
    hours: "Lun-Ven: 7h30-19h, Sam: 8h-17h",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400",
    hasPromotion: false,
  },
];

export const GARAGES: Garage[] = [
  {
    id: "g1",
    name: "Garage Martin & Fils",
    specialties: ["Toutes marques", "Carrosserie", "Pneus"],
    description: "Garage familial depuis 3 générations. Entretien, réparation et vente de véhicules d'occasion.",
    address: "Zone Industrielle, 15 Rue des Ateliers, 1000 Ville",
    phone: "+32 123 456 800",
    hours: "Lun-Ven: 8h-18h, Sam: 9h-12h",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400",
    vehiclesCount: 8,
    services: [
      { id: "s1", name: "Vidange", priceRange: "45€ - 80€" },
      { id: "s2", name: "Révision complète", priceRange: "150€ - 300€" },
      { id: "s3", name: "Changement pneus", priceRange: "20€/pneu" },
    ],
  },
  {
    id: "g2",
    name: "Auto Électrique Plus",
    specialties: ["Véhicules électriques", "Hybrides", "Diagnostic"],
    description: "Spécialiste des véhicules électriques et hybrides. Équipement de pointe.",
    address: "28 Boulevard de l'Innovation, 1000 Ville",
    phone: "+32 123 456 801",
    hours: "Lun-Ven: 8h30-18h30",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    vehiclesCount: 3,
    services: [
      { id: "s4", name: "Diagnostic batterie", priceRange: "50€ - 100€" },
      { id: "s5", name: "Mise à jour logiciel", priceRange: "80€" },
      { id: "s6", name: "Entretien complet", priceRange: "200€ - 400€" },
    ],
  },
  {
    id: "g3",
    name: "Carrosserie Dupont",
    specialties: ["Carrosserie", "Peinture", "Débosselage"],
    description: "Expert en carrosserie et peinture automobile. Travail soigné garanti.",
    address: "5 Rue des Artisans, 1000 Ville",
    phone: "+32 123 456 802",
    hours: "Lun-Ven: 8h-17h30",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400",
    vehiclesCount: 0,
    services: [
      { id: "s7", name: "Débosselage", priceRange: "80€ - 200€" },
      { id: "s8", name: "Peinture partielle", priceRange: "200€ - 500€" },
      { id: "s9", name: "Réparation pare-chocs", priceRange: "150€ - 350€" },
    ],
  },
];

export const COMMUNAL_SERVICES: CommunalService[] = [
  {
    id: "cs1",
    title: "Calendrier des déchets",
    description: "Consultez les dates de collecte pour votre quartier",
    icon: "trash.fill",
    category: "Environnement",
  },
  {
    id: "cs2",
    title: "Sacs poubelles",
    description: "Points de vente des sacs réglementaires",
    icon: "tag.fill",
    category: "Environnement",
  },
  {
    id: "cs3",
    title: "Rendez-vous Population",
    description: "Prenez rendez-vous pour vos démarches administratives",
    icon: "calendar",
    category: "Administration",
  },
  {
    id: "cs4",
    title: "Documents officiels",
    description: "Demande de documents (carte d'identité, passeport...)",
    icon: "doc.text.fill",
    category: "Administration",
  },
  {
    id: "cs5",
    title: "Signaler un problème",
    description: "Signalez un problème de voirie, éclairage...",
    icon: "exclamationmark.triangle.fill",
    category: "Voirie",
  },
  {
    id: "cs6",
    title: "Événements locaux",
    description: "Agenda des événements de la commune",
    icon: "megaphone.fill",
    category: "Culture",
  },
];

export const COMMUNAL_ALERTS: CommunalAlert[] = [
  {
    id: "a1",
    title: "Travaux Rue de la Gare",
    message: "Circulation perturbée du 15 au 30 janvier. Déviation mise en place.",
    date: "2026-01-10",
    type: "warning",
  },
  {
    id: "a2",
    title: "Collecte des sapins",
    message: "Déposez vos sapins de Noël aux points de collecte jusqu'au 20 janvier.",
    date: "2026-01-08",
    type: "info",
  },
  {
    id: "a3",
    title: "Fermeture exceptionnelle",
    message: "L'administration communale sera fermée le 15 janvier (formation du personnel).",
    date: "2026-01-12",
    type: "info",
  },
];

export const CAROUSEL_ITEMS = [
  {
    id: "c1",
    title: "Bienvenue sur VilleConnect",
    subtitle: "Votre ville à portée de main",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
    color: "#2563EB",
  },
  {
    id: "c2",
    title: "Soldes d'hiver",
    subtitle: "Jusqu'à -50% chez nos commerçants",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
    color: "#059669",
  },
  {
    id: "c3",
    title: "Marché du samedi",
    subtitle: "Place du Marché, 8h-13h",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    color: "#F59E0B",
  },
];
