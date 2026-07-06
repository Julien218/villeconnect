// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Design system VilleConnect OS — direction visuelle "Smart City Premium"
// Navy nuit + néon bleu/cyan + glassmorphism. Source de vérité pour tous les écrans.

export const theme = {
  colors: {
    // Fonds
    bgDeep:    '#060B18',   // fond général de l'app (plus profond que l'ancien #0A0F1E)
    bgHeader:  '#0B1330',   // header ville / hero
    surface:   'rgba(255,255,255,0.055)', // carte "glass" sur fond sombre
    surfaceSolid: '#101935',
    border:    'rgba(255,255,255,0.09)',
    borderCyan:'rgba(34,211,238,0.35)',

    // Accents néon
    cyan:      '#22D3EE',
    cyanSoft:  'rgba(34,211,238,0.15)',
    electric:  '#3B82F6',
    navyGrad1: '#0B1330',
    navyGrad2: '#132352',
    cyanGrad1: '#155E75',
    cyanGrad2: '#0891B2',

    // Texte
    textPrimary:   '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted:     '#5B6884',

    // Statuts
    success: '#34D399',
    warning: '#FBBF24',
    danger:  '#F87171',

    // Modules (bulles icônes colorées, façon maquette)
    modules: {
      actualites: { bg: 'rgba(59,130,246,0.16)',  fg: '#60A5FA' },
      agenda:     { bg: 'rgba(168,85,247,0.16)',  fg: '#C084FC' },
      signalement:{ bg: 'rgba(245,158,11,0.16)',  fg: '#FBBF24' },
      guichet:    { bg: 'rgba(34,197,94,0.16)',   fg: '#4ADE80' },
      commerces:  { bg: 'rgba(34,211,238,0.16)',  fg: '#22D3EE' },
      promotions: { bg: 'rgba(244,63,94,0.16)',   fg: '#FB7185' },
      carburant:  { bg: 'rgba(249,115,22,0.16)',  fg: '#FB923C' },
      entraide:   { bg: 'rgba(20,184,166,0.16)',  fg: '#2DD4BF' },
      commune:    { bg: 'rgba(99,102,241,0.16)',  fg: '#818CF8' },
      plus:       { bg: 'rgba(148,163,184,0.16)', fg: '#94A3B8' },
    },
  },
  radius: { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 20, xl: 28 },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    glow: {
      shadowColor: '#22D3EE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};

export type ThemeModuleKey = keyof typeof theme.colors.modules;
