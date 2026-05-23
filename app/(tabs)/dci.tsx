/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text, View, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";
import { trpc } from "@/lib/trpc";

type Status = "pending" | "offers" | "accepted" | "completed" | "cancelled";

export default function DCIScreen() {
  const colors = useColors();
  const { postalCode, city, isLoggedIn } = useAuth();
  const [newRequest, setNewRequest] = useState("");

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const { data: apiRequests, isLoading, refetch } = trpc.dci.myRequests.useQuery(
    undefined,
    { enabled: isLoggedIn }
  );
  const submitMutation = trpc.dci.submit.useMutation({
    onSuccess: () => {
      setNewRequest("");
      refetch();
      Alert.alert(
        "✅ Demande envoyée",
        "Votre demande a été transmise aux professionnels de " + (city ?? "votre commune") + ". Vous recevrez des offres sous peu."
      );
    },
    onError: () => {
      Alert.alert("Erreur", "Impossible d'envoyer la demande. Réessayez.");
    },
  });

  // Fallback local si pas encore logué
  const [localRequests, setLocalRequests] = useState<any[]>([]);
  const requests = isLoggedIn ? (apiRequests ?? []) : localRequests;

  const handleSubmit = () => {
    if (!newRequest.trim() || newRequest.trim().length < 10) {
      Alert.alert("Erreur", "Décrivez votre besoin en au moins 10 caractères.");
      return;
    }
    if (isLoggedIn) {
      submitMutation.mutate({
        description: newRequest.trim(),
        postalCode: postalCode ?? undefined,
        city: city ?? undefined,
      });
    } else {
      setLocalRequests(prev => [{
        id: Date.now().toString(),
        description: newRequest.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        offersCount: 0,
      }, ...prev]);
      setNewRequest("");
      Alert.alert("Demande enregistrée", "Demande sauvegardée localement.");
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: colors.accent, offers: colors.secondary,
      accepted: colors.primary, completed: colors.muted,
      cancelled: colors.error,
    };
    return map[status] ?? colors.muted;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: "En attente", offers: "Offres reçues",
      accepted: "Acceptée", completed: "Terminé",
      cancelled: "Annulée",
    };
    return map[status] ?? status;
  };

  const s = styles(colors);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.foreground }]}>Démarche Citoyenne</Text>
          <Text style={[s.subtitle, { color: colors.muted }]}>
            Exprimez votre besoin, recevez des offres{city ? ` à ${city}` : ""}
          </Text>
        </View>

        {/* Form */}
        <View style={[s.form, { backgroundColor: colors.surface }]}>
          <View style={s.formHeader}>
            <View style={[s.formIcon, { backgroundColor: colors.primary + "18" }]}>
              <IconSymbol name="message.fill" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.formTitle, { color: colors.foreground }]}>Nouvelle demande</Text>
              <Text style={[s.formHint, { color: colors.muted }]}>
                Les professionnels de votre commune vous répondront directement.
              </Text>
            </View>
          </View>
          <TextInput
            style={[s.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: Je cherche un électricien pour installer des prises dans mon garage, besoin d'un devis rapide..."
            placeholderTextColor={colors.muted}
            value={newRequest}
            onChangeText={setNewRequest}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={s.charRow}>
            <Text style={[s.charCount, { color: newRequest.length < 10 ? colors.error : colors.muted }]}>
              {newRequest.length} / 500 caractères
            </Text>
          </View>
          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: submitMutation.isPending ? colors.muted : colors.primary }]}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
            activeOpacity={0.8}
          >
            {submitMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <>
                  <IconSymbol name="paperplane.fill" size={18} color="#fff" />
                  <Text style={s.submitText}>Envoyer ma demande</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* List */}
        <View style={{ flex: 1, marginTop: 24 }}>
          <View style={s.listHeader}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Mes demandes</Text>
            {requests.length > 0 && (
              <View style={[s.countBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[s.countText, { color: colors.primary }]}>{requests.length}</Text>
              </View>
            )}
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={requests as any[]}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.card, { backgroundColor: colors.surface }]} activeOpacity={0.75}>
                  <View style={s.cardHead}>
                    <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) + "18" }]}>
                      <View style={[s.dot, { backgroundColor: getStatusColor(item.status) }]} />
                      <Text style={[s.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                    <Text style={[s.cardDate, { color: colors.muted }]}>
                      {new Date(item.createdAt ?? item.date).toLocaleDateString("fr-BE")}
                    </Text>
                  </View>
                  <Text style={[s.cardDesc, { color: colors.foreground }]}>{item.description}</Text>
                  {item.status === "offers" && (
                    <View style={[s.offersRow, { borderTopColor: colors.border }]}>
                      <IconSymbol name="doc.text.fill" size={15} color={colors.secondary} />
                      <Text style={[s.offersText, { color: colors.secondary }]}>
                        {item.offersCount ?? "Nouvelles"} offres reçues
                      </Text>
                      <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={{ fontSize: 44 }}>💬</Text>
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>Aucune demande</Text>
                  <Text style={[s.emptySub, { color: colors.muted }]}>
                    Créez votre première démarche citoyenne ci-dessus.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = (c: any) => StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title:       { fontSize: 28, fontWeight: "800" },
  subtitle:    { fontSize: 14, marginTop: 4 },
  form:        { marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 12 },
  formHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  formIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  formTitle:   { fontSize: 16, fontWeight: "700" },
  formHint:    { fontSize: 12, lineHeight: 17, marginTop: 2 },
  textArea:    { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 100, lineHeight: 22 },
  charRow:     { alignItems: "flex-end" },
  charCount:   { fontSize: 11 },
  submitBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8 },
  submitText:  { color: "#fff", fontSize: 16, fontWeight: "600" },
  listHeader:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  sectionTitle:{ fontSize: 18, fontWeight: "700" },
  countBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  countText:   { fontSize: 12, fontWeight: "700" },
  list:        { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card:        { padding: 16, borderRadius: 14, gap: 8 },
  cardHead:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 5 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  statusText:  { fontSize: 12, fontWeight: "600" },
  cardDate:    { fontSize: 12 },
  cardDesc:    { fontSize: 15, lineHeight: 22 },
  offersRow:   { flexDirection: "row", alignItems: "center", paddingTop: 10, borderTopWidth: 1, gap: 6 },
  offersText:  { flex: 1, fontSize: 14, fontWeight: "500" },
  empty:       { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle:  { fontSize: 17, fontWeight: "600" },
  emptySub:    { fontSize: 13, textAlign: "center", lineHeight: 18 },
});
