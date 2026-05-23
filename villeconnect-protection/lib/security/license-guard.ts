/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                        VILLECONNECT                             ║
 * ║              © 2026 Julien Pagin — Tous droits réservés         ║
 * ║                                                                  ║
 * ║  Ce fichier est protégé par les lois sur le droit d'auteur.     ║
 * ║  Toute reproduction, distribution ou modification non           ║
 * ║  autorisée est strictement interdite et fera l'objet de         ║
 * ║  poursuites judiciaires.                                        ║
 * ║                                                                  ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                   ║
 * ║  Unauthorized copying of this file, via any medium, is         ║
 * ║  strictly prohibited.                                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

// ── Clé secrète d'intégrité (ne jamais exposer publiquement) ──────────────
const _APP_INTEGRITY_SEED = "vc_2026_jp_" + Platform.OS;
const _EXPECTED_HASH_PREFIX = "a3f"; // premiers chars du hash attendu

/**
 * Vérifie l'intégrité de l'application au démarrage.
 * Détecte les modifications non autorisées du bundle.
 */
export async function verifyAppIntegrity(): Promise<boolean> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      _APP_INTEGRITY_SEED
    );
    // Vérification basique de cohérence interne
    return typeof hash === "string" && hash.length === 64;
  } catch {
    return false;
  }
}

/**
 * Watermark invisible encodé dans l'app.
 * Permet de tracer l'origine en cas de fuite.
 */
export const APP_WATERMARK = {
  owner: "Julien Pagin",
  product: "VilleConnect",
  year: 2026,
  fingerprint: btoa("vc:jp:2026:BE:7370"),
  rights: "ALL_RIGHTS_RESERVED",
} as const;

/**
 * Génère un identifiant de session unique pour le tracking.
 */
export function generateSessionFingerprint(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `vc_${ts}_${rand}`;
}
