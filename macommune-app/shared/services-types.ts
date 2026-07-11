// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Types écran Services
// Groupement des service_types par catégorie UI + icônes Ionicons

import type { ServiceLink } from '@/components/CityStatusBanner';

export type { ServiceLink };

// ─── Groupes UI ─────────────────────────────────────────────
export interface ServiceGroup {
  key: string;
  label: string;
  icon: string;           // Ionicons name
  serviceTypes: string[];
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    key: 'admin',
    label: 'Administration',
    icon: 'business-outline',
    serviceTypes: ['website', 'eguichet', 'citizen_account'],
  },
  {
    key: 'demarches',
    label: 'Démarches',
    icon: 'document-text-outline',
    serviceTypes: ['procedures', 'contact', 'cpas'],
  },
  {
    key: 'pratique',
    label: 'Vie pratique',
    icon: 'leaf-outline',
    serviceTypes: ['waste', 'works', 'urban', 'agenda'],
  },
  {
    key: 'annuaire',
    label: 'Annuaire & Commerce',
    icon: 'storefront-outline',
    serviceTypes: ['associations', 'commerce'],
  },
  {
    key: 'actu',
    label: 'Actualités',
    icon: 'newspaper-outline',
    serviceTypes: ['news'],
  },
  {
    key: 'autre',
    label: 'Autres services',
    icon: 'link-outline',
    serviceTypes: ['other'],
  },
];

// ─── Icône par service_type ──────────────────────────────────
export const SERVICE_TYPE_ICON: Record<string, string> = {
  website:        'globe-outline',
  eguichet:       'laptop-outline',
  citizen_account:'person-circle-outline',
  news:           'newspaper-outline',
  agenda:         'calendar-outline',
  procedures:     'document-text-outline',
  waste:          'trash-outline',
  works:          'construct-outline',
  urban:          'map-outline',
  cpas:           'heart-outline',
  contact:        'call-outline',
  associations:   'people-outline',
  commerce:       'storefront-outline',
  other:          'link-outline',
};

// ─── Regrouper les liens par groupe ─────────────────────────
export function groupServiceLinks(
  links: ServiceLink[]
): Array<ServiceGroup & { links: ServiceLink[] }> {
  const grouped = SERVICE_GROUPS.map(group => ({
    ...group,
    links: links.filter(l => group.serviceTypes.includes(l.service_type)),
  }));
  // Ajouter les types inconnus dans "autre"
  const knownTypes = SERVICE_GROUPS.flatMap(g => g.serviceTypes);
  const unknowns = links.filter(l => !knownTypes.includes(l.service_type));
  if (unknowns.length > 0) {
    const autreGroup = grouped.find(g => g.key === 'autre')!;
    autreGroup.links = [...autreGroup.links, ...unknowns];
  }
  // Ne retourner que les groupes qui ont des liens
  return grouped.filter(g => g.links.length > 0);
}
