/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  VILLECONNECT — Security Provider                               ║
 * ║  © 2026 Julien Pagin — PROPRIETARY & CONFIDENTIAL              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Ce composant doit envelopper TOUTE l'application dans _layout.tsx.
 * Il effectue les vérifications de sécurité au démarrage.
 */

import { useEffect, useState, ReactNode } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { verifyAppIntegrity, enforceDeviceSecurity, APP_WATERMARK } from "@/lib/security";

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    async function runSecurityChecks() {
      // 1. Vérifier l'intégrité de l'app
      const integrityOk = await verifyAppIntegrity();

      // 2. Vérifier l'appareil
      await enforceDeviceSecurity();

      // 3. Log du watermark (invisible pour l'utilisateur, traçable)
      if (__DEV__) {
        console.log("[VC Security]", APP_WATERMARK.fingerprint);
      }

      setIsVerified(integrityOk);
    }

    runSecurityChecks();
  }, []);

  // Écran de chargement pendant les vérifications
  if (isVerified === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Si la vérification échoue, bloquer l'accès
  if (!isVerified) {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>VilleConnect</Text>
        <Text style={styles.blockedMessage}>
          Une erreur de sécurité a été détectée. Veuillez réinstaller l'application.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  blockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 32,
  },
  blockedTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  blockedMessage: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
});
