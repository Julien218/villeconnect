/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

import { useColors } from "@/hooks/use-colors";
import { useAuth, BELGIAN_CITIES } from "@/contexts/auth-context";

// ─── Étapes ──────────────────────────────────────────────────────────────────

type Step = "welcome" | "postal" | "name" | "done";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep]               = useState<Step>("welcome");
  const [postalInput, setPostalInput] = useState("");
  const [nameInput, setNameInput]     = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ code: string; city: string }>>([]);
  const [selectedPostal, setSelectedPostal] = useState("");
  const [selectedCity, setSelectedCity]     = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const fadeToNext = (fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  // ── Postal code autocomplete ─────────────────────────────────────────────

  const onPostalChange = useCallback((text: string) => {
    setPostalInput(text);
    setError("");
    setSelectedPostal("");
    setSelectedCity("");

    if (text.length < 2) { setSuggestions([]); return; }

    const matches = Object.entries(BELGIAN_CITIES)
      .filter(([code, city]) =>
        code.startsWith(text) ||
        city.toLowerCase().includes(text.toLowerCase())
      )
      .slice(0, 6)
      .map(([code, city]) => ({ code, city }));

    setSuggestions(matches);
  }, []);

  const selectSuggestion = (code: string, city: string) => {
    setPostalInput(code);
    setSelectedPostal(code);
    setSelectedCity(city);
    setSuggestions([]);
  };

  const confirmPostal = () => {
    const direct = BELGIAN_CITIES[postalInput];
    if (direct) {
      setSelectedPostal(postalInput);
      setSelectedCity(direct);
      setSuggestions([]);
      fadeToNext(() => setStep("name"));
      return;
    }
    if (!selectedPostal) {
      setError("Entrez un code postal belge valide (ex : 7370, 1000, 4000)");
      return;
    }
    fadeToNext(() => setStep("name"));
  };

  // ── Final login ──────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login(selectedPostal, selectedCity, nameInput.trim() || undefined);
      fadeToNext(() => setStep("done"));
      setTimeout(() => router.replace("/(tabs)"), 1200);
    } catch (e) {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  const s = styles(colors);

  // ── Renders ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoBlock}>
          <View style={s.logoCircle}>
            <Text style={s.logoText}>V</Text>
          </View>
          <Text style={s.logoTitle}>VilleConnect</Text>
          <Text style={s.logoSub}>Votre commune dans votre poche</Text>
        </View>

        <Animated.View style={[s.card, { opacity: fadeAnim }]}>

          {/* ── STEP: WELCOME ─────────────────────────────────────────── */}
          {step === "welcome" && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Bienvenue 👋</Text>
              <Text style={s.stepDesc}>
                VilleConnect vous connecte à votre commune : événements, commerces, alertes,
                démarches citoyennes — tout en un seul endroit.
              </Text>
              <View style={s.featureList}>
                {[
                  ["🏛️", "Services communaux en temps réel"],
                  ["🛒", "Commerces & garages locaux"],
                  ["📅", "Événements et activités"],
                  ["🚨", "Alertes et signalements"],
                  ["💬", "Démarches citoyennes intelligentes"],
                ].map(([icon, label]) => (
                  <View key={label} style={s.featureRow}>
                    <Text style={s.featureIcon}>{icon}</Text>
                    <Text style={[s.featureLabel, { color: colors.foreground }]}>{label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[s.btnPrimary, { backgroundColor: colors.primary }]} onPress={() => fadeToNext(() => setStep("postal"))}>
                <Text style={s.btnPrimaryText}>Commencer →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: POSTAL CODE ─────────────────────────────────────── */}
          {step === "postal" && (
            <View style={s.stepWrap}>
              <View style={s.stepBadge}><Text style={s.stepBadgeText}>1 / 2</Text></View>
              <Text style={s.stepTitle}>Votre commune 📍</Text>
              <Text style={s.stepDesc}>
                Entrez votre code postal belge pour accéder aux infos de votre commune.
              </Text>
              <View>
                <TextInput
                  style={[s.input, { borderColor: error ? colors.error : selectedPostal ? colors.secondary : colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                  placeholder="Ex : 7370, 1000, 4000..."
                  placeholderTextColor={colors.muted}
                  value={postalInput}
                  onChangeText={onPostalChange}
                  keyboardType="numeric"
                  maxLength={10}
                  autoFocus
                />
                {selectedCity ? (
                  <View style={[s.cityConfirmed, { backgroundColor: colors.secondary + "15" }]}>
                    <Text style={[s.cityConfirmedText, { color: colors.secondary }]}>
                      ✓ {selectedCity} ({selectedPostal})
                    </Text>
                  </View>
                ) : null}
                {error ? <Text style={[s.errorText, { color: colors.error }]}>{error}</Text> : null}
                {suggestions.length > 0 && (
                  <View style={[s.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {suggestions.map(({ code, city }) => (
                      <TouchableOpacity
                        key={code}
                        style={[s.suggestionRow, { borderBottomColor: colors.border }]}
                        onPress={() => selectSuggestion(code, city)}
                      >
                        <Text style={[s.suggestionCode, { color: colors.primary }]}>{code}</Text>
                        <Text style={[s.suggestionCity, { color: colors.foreground }]}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: colors.primary, marginTop: 20 }]}
                onPress={confirmPostal}
              >
                <Text style={s.btnPrimaryText}>Confirmer →</Text>
              </TouchableOpacity>
              <Text style={[s.privacyNote, { color: colors.muted }]}>
                🔒 Votre localisation reste sur votre appareil. Aucune donnée personnelle requise.
              </Text>
            </View>
          )}

          {/* ── STEP: NAME ────────────────────────────────────────────── */}
          {step === "name" && (
            <View style={s.stepWrap}>
              <View style={s.stepBadge}><Text style={s.stepBadgeText}>2 / 2</Text></View>
              <Text style={s.stepTitle}>Comment vous appelez-vous ?</Text>
              <Text style={s.stepDesc}>
                Optionnel — personnalise votre expérience dans la commune de{" "}
                <Text style={{ fontWeight: "700", color: colors.primary }}>{selectedCity}</Text>.
              </Text>
              <TextInput
                style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="Votre prénom (optionnel)"
                placeholderTextColor={colors.muted}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              {error ? <Text style={[s.errorText, { color: colors.error }]}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: isLoading ? colors.muted : colors.secondary, marginTop: 20 }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnPrimaryText}>Accéder à {selectedCity} 🚀</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogin} style={{ marginTop: 12, alignItems: "center" }}>
                <Text style={[s.skipText, { color: colors.muted }]}>Passer cette étape →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: DONE ────────────────────────────────────────────── */}
          {step === "done" && (
            <View style={[s.stepWrap, { alignItems: "center" }]}>
              <Text style={{ fontSize: 60 }}>🎉</Text>
              <Text style={[s.stepTitle, { textAlign: "center" }]}>
                Bienvenue à {selectedCity} !
              </Text>
              <Text style={[s.stepDesc, { textAlign: "center" }]}>
                Votre commune est configurée. Chargement en cours...
              </Text>
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            </View>
          )}

        </Animated.View>

        {/* Footer */}
        <Text style={[s.footer, { color: colors.muted }]}>
          © 2026 VilleConnect — Julien Pagin. Tous droits réservés.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = (colors: any) => StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  logoBlock: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center", alignItems: "center",
    marginBottom: 12,
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  logoText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  logoTitle: { fontSize: 28, fontWeight: "800", color: colors.foreground },
  logoSub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  stepWrap: { gap: 0 },
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    marginBottom: 14,
  },
  stepBadgeText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  stepTitle: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginBottom: 10 },
  stepDesc: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 20 },
  featureList: { gap: 12, marginBottom: 24 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 22, width: 32 },
  featureLabel: { fontSize: 15, fontWeight: "500" },
  input: {
    borderWidth: 1.5, borderRadius: 12,
    padding: 14, fontSize: 16,
    fontWeight: "500", marginBottom: 4,
  },
  cityConfirmed: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 4,
  },
  cityConfirmedText: { fontSize: 14, fontWeight: "600" },
  errorText: { fontSize: 13, marginBottom: 4 },
  suggestions: {
    borderWidth: 1, borderRadius: 12,
    overflow: "hidden", marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  suggestionRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionCode: { fontSize: 15, fontWeight: "700", minWidth: 44 },
  suggestionCity: { fontSize: 14, fontWeight: "500" },
  btnPrimary: {
    paddingVertical: 15, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipText: { fontSize: 14 },
  privacyNote: { fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 18 },
  footer: { textAlign: "center", fontSize: 11, marginTop: 32 },
});
