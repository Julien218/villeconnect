/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "pro" | "commune";
  postalCode: string | null;
  city: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  postalCode: string | null;
  city: string | null;
  login: (postalCode: string, city: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateLocation: (postalCode: string, city: string) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY_POSTAL = "vc_postal_code";
const STORAGE_KEY_CITY   = "vc_city";
const STORAGE_KEY_USER   = "vc_user";

// ─── Belgian Postal Code → City lookup (subset) ───────────────────────────────

export const BELGIAN_CITIES: Record<string, string> = {
  "1000": "Bruxelles", "1020": "Laeken", "1030": "Schaerbeek",
  "1040": "Etterbeek", "1050": "Ixelles", "1060": "Saint-Gilles",
  "1070": "Anderlecht", "1080": "Molenbeek", "1090": "Jette",
  "1150": "Woluwe-Saint-Pierre", "1160": "Auderghem", "1170": "Watermael-Boitsfort",
  "1180": "Uccle", "1190": "Forest", "1200": "Woluwe-Saint-Lambert",
  "1210": "Saint-Josse", "1300": "Wavre", "1301": "Bierges",
  "1340": "Ottignies", "1348": "Louvain-la-Neuve", "1400": "Nivelles",
  "1420": "Braine-l'Alleud", "1430": "Rebecq", "1450": "Chastre",
  "1500": "Halle", "1600": "Sint-Pieters-Leeuw", "1700": "Dilbeek",
  "1800": "Vilvoorde", "1820": "Steenokkerzeel", "1830": "Machelen",
  "1850": "Grimbergen", "1900": "Overijse", "2000": "Anvers",
  "2018": "Anvers (Zurenborg)", "2020": "Anvers (Kiel)", "2060": "Anvers (Merksem)",
  "2100": "Deurne", "2140": "Borgerhout", "2150": "Borsbeek",
  "2200": "Herentals", "2300": "Turnhout", "2440": "Geel",
  "2500": "Lier", "2550": "Kontich", "2600": "Berchem",
  "2610": "Wilrijk", "2640": "Mortsel", "2650": "Edegem",
  "2800": "Malines", "2900": "Schoten", "3000": "Louvain",
  "3010": "Kessel-Lo", "3020": "Herent", "3500": "Hasselt",
  "3600": "Genk", "3700": "Tongres", "3800": "Sint-Truiden",
  "3900": "Overpelt", "4000": "Liège", "4020": "Liège (Jupille)",
  "4030": "Liège (Grivegnée)", "4040": "Herstal", "4100": "Seraing",
  "4200": "Huy", "4300": "Waremme", "4400": "Flémalle",
  "4500": "Huy (Ben-Ahin)", "4600": "Visé", "4700": "Eupen",
  "4800": "Verviers", "4900": "Spa", "5000": "Namur",
  "5020": "Namur (Champion)", "5100": "Namur (Jambes)", "5300": "Andenne",
  "5500": "Dinant", "5600": "Philippeville", "6000": "Charleroi",
  "6001": "Marcinelle", "6020": "Charleroi (Dampremy)", "6030": "Charleroi (Marchienne)",
  "6040": "Charleroi (Jumet)", "6060": "Charleroi (Gilly)", "6110": "Montigny-le-Tilleul",
  "6200": "Châtelet", "6220": "Fleurus", "6460": "Chimay",
  "6530": "Thuin", "6700": "Arlon", "6800": "Libramont",
  "6900": "Marche-en-Famenne", "7000": "Mons", "7011": "Mons (Ghlin)",
  "7050": "Jurbise", "7060": "Soignies", "7100": "La Louvière",
  "7110": "La Louvière (Houdeng)", "7130": "Binche", "7140": "Morlanwelz",
  "7160": "Chapelle-lez-Herlaimont", "7170": "Manage", "7190": "Ecaussinnes",
  "7300": "Boussu", "7500": "Tournai", "7600": "Péruwelz",
  "7700": "Mouscron", "7800": "Ath", "7900": "Leuze",
  "8000": "Bruges", "8020": "Bruges (Ruddervoorde)", "8200": "Sint-Andries",
  "8400": "Ostende", "8500": "Courtrai", "8800": "Roulers",
  "9000": "Gand", "9032": "Gand (Wondelgem)", "9100": "Saint-Nicolas",
  "9200": "Termonde", "9300": "Alost", "9400": "Ninove",
  "9500": "Grammont", "9600": "Renaix", "9700": "Oudenaarde",
  "9800": "Deinze", "9900": "Eeklo",
  // Communes spécifiques proches de Dour
  "7370": "Dour", "7380": "Quiévrain", "7390": "Quaregnon",
  "7320": "Bernissart", "7321": "Bernissart (Harchies)", "7350": "Hensies",
  "7360": "Mons (Erbaut)", "7340": "Colfontaine", "7330": "Saint-Ghislain",
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [postalCode, setPostalCode] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedPostal, storedCity, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_POSTAL),
          AsyncStorage.getItem(STORAGE_KEY_CITY),
          AsyncStorage.getItem(STORAGE_KEY_USER),
        ]);
        if (storedPostal) setPostalCode(storedPostal);
        if (storedCity)   setCity(storedCity);
        if (storedUser)   setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("[Auth] restore error", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (pc: string, c: string, name?: string) => {
    const fakeUser: AuthUser = {
      id: 0, name: name ?? null, email: null,
      role: "user", postalCode: pc, city: c,
    };
    setUser(fakeUser);
    setPostalCode(pc);
    setCity(c);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_POSTAL, pc),
      AsyncStorage.setItem(STORAGE_KEY_CITY, c),
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(fakeUser)),
    ]);
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.multiRemove([STORAGE_KEY_POSTAL, STORAGE_KEY_CITY, STORAGE_KEY_USER]);
  };

  const updateLocation = async (pc: string, c: string) => {
    setPostalCode(pc);
    setCity(c);
    if (user) {
      const updated = { ...user, postalCode: pc, city: c };
      setUser(updated);
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    }
    await AsyncStorage.setItem(STORAGE_KEY_POSTAL, pc);
    await AsyncStorage.setItem(STORAGE_KEY_CITY, c);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading,
      isLoggedIn: !!postalCode,
      postalCode, city,
      login, logout, updateLocation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
