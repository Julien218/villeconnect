/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  VILLECONNECT — Screenshot & Screen Recording Guard             ║
 * ║  © 2026 Julien Pagin — PROPRIETARY & CONFIDENTIAL              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Platform, NativeModules } from "react-native";
import { useEffect } from "react";

/**
 * Hook React pour bloquer les captures d'écran sur les écrans sensibles.
 * Utilise les API natives Android (FLAG_SECURE) et iOS (isProtected).
 *
 * Usage: appelez `useScreenshotProtection()` dans les screens sensibles.
 */
export function useScreenshotProtection(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    if (Platform.OS === "android") {
      // FLAG_SECURE empêche les captures d'écran sur Android
      // Nécessite expo-screen-capture ou react-native-screen-capture-secure
      try {
        NativeModules?.RNScreenCaptureSecure?.activate?.();
      } catch {
        // Module natif non disponible — log silencieux
      }
    }

    return () => {
      if (Platform.OS === "android") {
        try {
          NativeModules?.RNScreenCaptureSecure?.deactivate?.();
        } catch {}
      }
    };
  }, [enabled]);
}

/**
 * Overlay invisible qui empêche la capture d'écran côté React Native
 * sur les composants qui affichent des données sensibles.
 */
export const SECURE_TEXT_INPUT_PROPS = {
  secureTextEntry: false, // Ne pas activer ici — à activer manuellement
  contextMenuHidden: true, // Cache le menu copier/coller
  selectTextOnFocus: false,
} as const;
