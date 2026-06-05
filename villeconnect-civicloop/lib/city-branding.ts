/**
 * CityBranding — Moteur de branding dynamique par code postal
 * © 2026 VilleConnect / Ma Commune — JS-Innov.IA
 *
 * Logique centrale :
 *   code postal → ville → AppName + slug + couleurs + assets
 *
 * Exemples :
 *   "7370" → DourConnect
 *   "7000" → MonsConnect
 *   "1000" → BruxellesConnect
 *   "4000" → LiègeConnect
 *
 * Usage :
 *   import { getBranding, useCityBranding } from "@/lib/city-branding";
 *   const brand = getBranding(user.postalCode);
 *   brand.appName       // "DourConnect"
 *   brand.cityName      // "Dour"
 *   brand.slug          // "dour"
 *   brand.hashtag       // "#DourConnect"
 *   brand.colors.primary // "#2563EB"
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";

// ─── Couleurs par région ──────────────────────────────────────────────────────

const REGION_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  "7": { primary: "#2563EB", secondary: "#7c3aed", accent: "#f59e0b" }, // Hainaut
  "1": { primary: "#dc2626", secondary: "#1e40af", accent: "#f59e0b" }, // Bruxelles
  "4": { primary: "#7c3aed", secondary: "#0891b2", accent: "#f59e0b" }, // Liège
  "5": { primary: "#059669", secondary: "#2563EB", accent: "#f59e0b" }, // Namur
  "6": { primary: "#1e293b", secondary: "#6366f1", accent: "#f59e0b" }, // Charleroi
  "2": { primary: "#1d4ed8", secondary: "#fbbf24", accent: "#f59e0b" }, // Anvers
  "3": { primary: "#1d4ed8", secondary: "#fbbf24", accent: "#f59e0b" }, // Limbourg
  "8": { primary: "#1e40af", secondary: "#fbbf24", accent: "#f59e0b" }, // Flandre Occ.
  "9": { primary: "#1e40af", secondary: "#fbbf24", accent: "#f59e0b" }, // Flandre Or.
};

// ─── Surcharge spécifique par ville ──────────────────────────────────────────

const CITY_COLOR_OVERRIDE: Record<string, { primary: string; secondary: string; accent: string }> = {
  "7370": { primary: "#2563EB", secondary: "#7c3aed", accent: "#f59e0b" }, // Dour
  "7000": { primary: "#1d4ed8", secondary: "#6d28d9", accent: "#f59e0b" }, // Mons
  "1000": { primary: "#dc2626", secondary: "#1e40af", accent: "#f59e0b" }, // Bruxelles
  "4000": { primary: "#7c3aed", secondary: "#0891b2", accent: "#f59e0b" }, // Liège
  "6000": { primary: "#1e293b", secondary: "#6366f1", accent: "#f59e0b" }, // Charleroi
  "5000": { primary: "#059669", secondary: "#2563EB", accent: "#f59e0b" }, // Namur
  "9000": { primary: "#1e40af", secondary: "#fbbf24", accent: "#f59e0b" }, // Gand
  "8000": { primary: "#1e3a5f", secondary: "#fbbf24", accent: "#f59e0b" }, // Bruges
  "8400": { primary: "#0891b2", secondary: "#1e40af", accent: "#f59e0b" }, // Ostende
  "4900": { primary: "#065f46", secondary: "#2563EB", accent: "#f59e0b" }, // Spa
};

// ─── Emojis représentatifs ────────────────────────────────────────────────────

const CITY_EMOJI: Record<string, string> = {
  "7370": "⛏️",  // Dour — héritage minier borinage
  "7000": "🏰",  // Mons — beffroi, Grand-Place
  "1000": "🇧🇪", // Bruxelles — capitale
  "4000": "🌊",  // Liège — Meuse
  "6000": "🏭",  // Charleroi — industrie
  "5000": "🏛️", // Namur — citadelle
  "9000": "🌸",  // Gand — Floralies
  "8000": "⛪",  // Bruges — Basilique
  "8400": "🌊",  // Ostende — mer du Nord
  "4900": "🛁",  // Spa — eaux thermales
  "4800": "🏔️", // Verviers — Ardennes
  "7500": "🏟️", // Tournai — cathédrale
  "5500": "🏰",  // Dinant — citadelle
  "3000": "🎓",  // Louvain — université
  "2000": "⚓",  // Anvers — port
};

// ─── Base de données codes postaux belges (centralisée ici) ──────────────────

export const BELGIAN_CITIES: Record<string, string> = {
  // Bruxelles
  "1000": "Bruxelles", "1020": "Laeken", "1030": "Schaerbeek",
  "1040": "Etterbeek", "1050": "Ixelles", "1060": "Saint-Gilles",
  "1070": "Anderlecht", "1080": "Molenbeek", "1090": "Jette",
  "1150": "Woluwe-Saint-Pierre", "1160": "Auderghem",
  "1170": "Watermael-Boitsfort", "1180": "Uccle", "1190": "Forest",
  "1200": "Woluwe-Saint-Lambert", "1210": "Saint-Josse",
  // Brabant Wallon
  "1300": "Wavre", "1348": "Louvain-la-Neuve", "1400": "Nivelles",
  "1420": "Braine-l'Alleud", "1430": "Rebecq",
  // Brabant Flamand
  "1500": "Halle", "1700": "Dilbeek", "1800": "Vilvoorde",
  "1820": "Steenokkerzeel", "1850": "Grimbergen", "1900": "Overijse",
  // Anvers
  "2000": "Anvers", "2060": "Anvers", "2100": "Deurne",
  "2200": "Herentals", "2300": "Turnhout", "2440": "Geel",
  "2500": "Lier", "2600": "Berchem", "2800": "Malines", "2900": "Schoten",
  // Limbourg
  "3000": "Louvain", "3500": "Hasselt", "3600": "Genk",
  "3700": "Tongres", "3800": "Sint-Truiden",
  // Liège
  "4000": "Liège", "4020": "Liège", "4030": "Liège",
  "4040": "Herstal", "4100": "Seraing", "4200": "Huy",
  "4300": "Waremme", "4400": "Flémalle", "4600": "Visé",
  "4700": "Eupen", "4800": "Verviers", "4900": "Spa",
  // Namur
  "5000": "Namur", "5100": "Namur", "5300": "Andenne",
  "5500": "Dinant", "5600": "Philippeville",
  // Luxembourg
  "6700": "Arlon", "6800": "Libramont", "6900": "Marche-en-Famenne",
  // Hainaut
  "6000": "Charleroi", "6001": "Marcinelle", "6040": "Charleroi",
  "6060": "Charleroi", "6110": "Montigny-le-Tilleul",
  "6200": "Châtelet", "6220": "Fleurus", "6460": "Chimay",
  "6530": "Thuin",
  "7000": "Mons", "7011": "Mons", "7050": "Jurbise",
  "7060": "Soignies", "7100": "La Louvière", "7110": "La Louvière",
  "7130": "Binche", "7140": "Morlanwelz",
  "7160": "Chapelle-lez-Herlaimont", "7170": "Manage",
  "7190": "Ecaussinnes", "7300": "Boussu",
  "7320": "Bernissart", "7330": "Saint-Ghislain",
  "7340": "Colfontaine", "7350": "Hensies",
  "7370": "Dour", "7380": "Quiévrain", "7390": "Quaregnon",
  "7500": "Tournai", "7600": "Péruwelz",
  "7700": "Mouscron", "7800": "Ath", "7900": "Leuze",
  // Flandre Occidentale
  "8000": "Bruges", "8400": "Ostende", "8500": "Courtrai",
  "8800": "Roulers",
  // Flandre Orientale
  "9000": "Gand", "9100": "Saint-Nicolas", "9200": "Termonde",
  "9300": "Alost", "9400": "Ninove", "9700": "Oudenaarde",
  "9800": "Deinze", "9900": "Eeklo",
};

// ─── Interface publique ───────────────────────────────────────────────────────

export interface CityBranding {
  /** Ex: "DourConnect" — nom complet de l'app pour cette ville */
  appName: string;
  /** Ex: "Dour" — nom affiché */
  cityName: string;
  /** Ex: "dour" — URL safe, sans accents */
  slug: string;
  /** Ex: "7370" */
  postalCode: string;
  /** Ex: "#DourConnect" */
  hashtag: string;
  /** Ex: "macommune.dour" */
  instagramHandle: string;
  /** Ex: "Ma Commune · Dour" */
  shortName: string;
  /** Couleurs de la ville */
  colors: { primary: string; secondary: string; accent: string };
  /** Emoji représentatif */
  emoji: string;
  /** URL publique */
  webUrl: string;
  /** Message de bienvenue dans l'app */
  welcomeMessage: string;
  /** Tagline */
  tagline: string;
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function slugify(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function cleanCityName(city: string): string {
  // "Liège (Jupille)" → "Liège" | "Charleroi (Dampremy)" → "Charleroi"
  return city.split("(")[0].trim();
}

// ─── Fonction principale ──────────────────────────────────────────────────────

export function getBranding(postalCode: string | null | undefined): CityBranding {
  const postal = (postalCode ?? "7370").trim();
  const rawCity = BELGIAN_CITIES[postal] ?? "Ma Commune";
  const cityName = cleanCityName(rawCity);
  const slug = slugify(cityName);
  const colors =
    CITY_COLOR_OVERRIDE[postal] ??
    REGION_COLORS[postal[0]] ??
    REGION_COLORS["7"];
  const emoji = CITY_EMOJI[postal] ?? "🏘️";
  const appName = `${cityName}Connect`;

  return {
    appName,
    cityName,
    slug,
    postalCode: postal,
    hashtag: `#${cityName.replace(/\s/g, "")}Connect`,
    instagramHandle: `macommune.${slug}`,
    shortName: `Ma Commune · ${cityName}`,
    colors,
    emoji,
    webUrl: `https://macommune.be/${slug}`,
    welcomeMessage: `Bienvenue sur ${appName} !`,
    tagline: `Votre commune connectée — ${cityName}`,
  };
}

// ─── Hook React ───────────────────────────────────────────────────────────────

export function useCityBranding(): CityBranding {
  const { postalCode } = useAuth();
  return useMemo(() => getBranding(postalCode), [postalCode]);
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

/** Titre branded pour un post réseau social */
export function brandedPostTitle(postal: string, eventTitle: string): string {
  const b = getBranding(postal);
  return `${b.emoji} ${eventTitle} — ${b.cityName}`;
}

/** Hashtags complets pour un post */
export function brandedHashtags(postal: string, extra: string[] = []): string {
  const b = getBranding(postal);
  return [b.hashtag, `#${b.slug}`, "#macommune", "#communebelge", "#belgique", ...extra].join(" ");
}

/** Nom court (pour tabs et headers) */
export function appNameShort(postal: string): string {
  return getBranding(postal).cityName;
}
