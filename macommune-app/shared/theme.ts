// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Design system VilleConnect OS — ADN visuel officiel (planches "ADN clair" / "ADN foncé").
// Source de vérité unique pour la palette, la typographie et les composants dans les
// trois modes : clair, sombre, automatique (suit le système).
//
// Palette officielle (planches ADN) :
//   #0A2D5E — Navy (brand)      #0047FF — Bleu (brand primaire)
//   #00E5FF — Cyan (accent)     #00BFA5 — Vert/Teal (secondaire, succès)
//   #F5F7FA — Fond clair        #FFFFFF — Blanc (texte/logo sur fond sombre)
//   #AEB6C1 — Gris neutre
// Typographie officielle : Poppins (Bold / SemiBold).
//
// Règle produit : le logo principal ne change JAMAIS. Seule l'interface se décline.

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme = 'light' | 'dark';

export const BRAND: Record<'navy' | 'blue' | 'cyan' | 'teal' | 'gray', string> = {
  navy: '#0A2D5E',
  blue: '#0047FF',
  cyan: '#00E5FF',
  teal: '#00BFA5',
  gray: '#AEB6C1',
};

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
const spacing = { xs: 6, sm: 10, md: 16, lg: 20, xl: 28 };

const shadowCard = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.2,
  shadowRadius: 16,
  elevation: 6,
};
const shadowGlow = {
  shadowColor: BRAND.cyan,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
  elevation: 8,
};

// Bulles de modules (icônes colorées façon maquette) — mêmes teintes dans les deux
// modes : ce sont des surfaces translucides à faible opacité, lisibles sur clair et sombre.
const modules = {
  actualites: { bg: 'rgba(0,71,255,0.14)', fg: '#3B7BFF' },
  agenda: { bg: 'rgba(168,85,247,0.14)', fg: '#A855F7' },
  signalement: { bg: 'rgba(245,158,11,0.14)', fg: '#F59E0B' },
  guichet: { bg: 'rgba(0,191,165,0.14)', fg: BRAND.teal },
  commerces: { bg: 'rgba(0,229,255,0.14)', fg: '#00A8BF' },
  promotions: { bg: 'rgba(244,63,94,0.14)', fg: '#E11D48' },
  carburant: { bg: 'rgba(249,115,22,0.14)', fg: '#F97316' },
  entraide: { bg: 'rgba(20,184,166,0.14)', fg: '#0D9488' },
  commune: { bg: 'rgba(99,102,241,0.14)', fg: '#6366F1' },
  services: { bg: 'rgba(0,229,255,0.10)', fg: '#00BFA5' },
  plus: { bg: 'rgba(174,182,193,0.18)', fg: '#7C8798' },
};

// Badges/tags (planche "12 - BADGES & TAGS") : Nouveau / Offre / Important / En cours / Terminé
const badgesShared = {
  nouveau: { fg: BRAND.teal },
  offre: { fg: BRAND.blue },
  important: { fg: '#E11D48' },
  enCours: { fg: '#7C3AED' },
  termine: { fg: BRAND.gray },
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  colors: {
    bgDeep: '#060B18',
    bgHeader: '#0B1330',
    surface: 'rgba(255,255,255,0.055)',
    surfaceSolid: '#101935',
    border: 'rgba(255,255,255,0.09)',
    borderCyan: 'rgba(0,229,255,0.35)',

    cyan: BRAND.cyan,
    electric: BRAND.blue,
    teal: BRAND.teal,
    cyanSoft: 'rgba(0,229,255,0.15)',
    navyGrad1: '#0B1330',
    navyGrad2: '#132352',
    cyanGrad1: '#0E4E68',
    cyanGrad2: '#0891B2',

    textPrimary: '#FFFFFF',
    textSecondary: BRAND.gray,
    textMuted: '#5B6884',

    success: BRAND.teal,
    warning: '#FBBF24',
    danger: '#F87171',

    modules,
    badges: {
      nouveau: { bg: 'rgba(0,191,165,0.18)', ...badgesShared.nouveau },
      offre: { bg: 'rgba(0,71,255,0.18)', ...badgesShared.offre },
      important: { bg: 'rgba(225,29,72,0.18)', ...badgesShared.important },
      enCours: { bg: 'rgba(124,58,237,0.18)', ...badgesShared.enCours },
      termine: { bg: 'rgba(174,182,193,0.16)', ...badgesShared.termine },
    },
  },
  radius,
  spacing,
  shadow: { card: shadowCard, glow: shadowGlow },
  fonts,
  statusBarStyle: 'light',
};

export const lightTheme: ThemeTokens = {
  mode: 'light',
  colors: {
    bgDeep: '#F5F7FA',
    bgHeader: '#FFFFFF',
    surface: 'rgba(10,45,94,0.045)',
    surfaceSolid: '#FFFFFF',
    border: 'rgba(10,45,94,0.10)',
    borderCyan: 'rgba(0,71,255,0.22)',

    cyan: '#00A8BF',
    electric: BRAND.blue,
    teal: BRAND.teal,
    cyanSoft: 'rgba(0,71,255,0.08)',
    navyGrad1: BRAND.navy,
    navyGrad2: '#123B7A',
    cyanGrad1: '#0072B5',
    cyanGrad2: '#0091A8',

    textPrimary: BRAND.navy,
    textSecondary: '#4B5A72',
    textMuted: BRAND.gray,

    success: '#00997F',
    warning: '#B45309',
    danger: '#DC2626',

    modules,
    badges: {
      nouveau: { bg: 'rgba(0,191,165,0.12)', ...badgesShared.nouveau },
      offre: { bg: 'rgba(0,71,255,0.10)', ...badgesShared.offre },
      important: { bg: 'rgba(225,29,72,0.10)', ...badgesShared.important },
      enCours: { bg: 'rgba(124,58,237,0.10)', ...badgesShared.enCours },
      termine: { bg: 'rgba(174,182,193,0.20)', ...badgesShared.termine },
    },
  },
  radius,
  spacing,
  shadow: {
    card: { ...shadowCard, shadowOpacity: 0.08 },
    glow: { ...shadowGlow, shadowOpacity: 0.18 },
  },
  fonts,
  statusBarStyle: 'dark',
};

function mixHex(base: string, target: string, amount: number): string {
  const parse = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const [br, bg, bb] = parse(base);
  const [tr, tg, tb] = parse(target);
  const channel = (from: number, to: number) => Math.round(from + (to - from) * amount)
    .toString(16).padStart(2, '0');
  return `#${channel(br, tr)}${channel(bg, tg)}${channel(bb, tb)}`.toUpperCase();
}

export function withAccentColor(theme: ThemeTokens, accentColor: string | null): ThemeTokens {
  if (!accentColor) return theme;

  const softRgb = [1, 3, 5].map((start) => Number.parseInt(accentColor.slice(start, start + 2), 16)).join(',');
  const paleTarget = theme.mode === 'dark' ? '#FFFFFF' : '#000000';

  return {
    ...theme,
    colors: {
      ...theme.colors,
      cyan: accentColor,
      electric: accentColor,
      teal: mixHex(accentColor, paleTarget, theme.mode === 'dark' ? 0.2 : 0.12),
      cyanSoft: `rgba(${softRgb},0.15)`,
      borderCyan: `rgba(${softRgb},0.38)`,
      cyanGrad1: mixHex(accentColor, '#000000', 0.42),
      cyanGrad2: accentColor,
    },
    shadow: {
      ...theme.shadow,
      glow: { ...theme.shadow.glow, shadowColor: accentColor },
    },
  };
}

export interface ThemeModuleColors { bg: string; fg: string; }
export interface ThemeBadgeColors { bg: string; fg: string; }
export interface ThemeTokens {
  mode: ColorScheme;
  colors: {
    bgDeep: string; bgHeader: string; surface: string; surfaceSolid: string;
    border: string; borderCyan: string;
    cyan: string; electric: string; teal: string; cyanSoft: string;
    navyGrad1: string; navyGrad2: string; cyanGrad1: string; cyanGrad2: string;
    textPrimary: string; textSecondary: string; textMuted: string;
    success: string; warning: string; danger: string;
    modules: Record<string, ThemeModuleColors>;
    badges: Record<'nouveau' | 'offre' | 'important' | 'enCours' | 'termine', ThemeBadgeColors>;
  };
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  shadow: { card: object; glow: object };
  fonts: typeof fonts;
  statusBarStyle: 'light' | 'dark';
}
export type ThemeModuleKey = keyof typeof modules;
export type BadgeKey = keyof typeof badgesShared;

// Conservé pour compatibilité descendante : les écrans pas encore migrés vers
// useTheme() continuent de fonctionner (mode sombre par défaut, identique à avant).
export const theme = darkTheme;
