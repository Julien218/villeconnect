/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface DCIRequest {
  id: string;
  description: string;
  status: "pending" | "offers" | "completed";
  date: string;
  offersCount: number;
}

export default function DCIScreen() {
  const colors = useColors();
  const [newRequest, setNewRequest] = useState("");
  const [requests, setRequests] = useState<DCIRequest[]>([
    {
      id: "1",
      description: "Je cherche un plombier pour réparer une fuite dans ma salle de bain",
      status: "offers",
      date: "2026-01-10",
      offersCount: 3,
    },
    {
      id: "2",
      description: "Besoin d'un traiteur pour un anniversaire (30 personnes)",
      status: "pending",
      date: "2026-01-11",
      offersCount: 0,
    },
  ]);

  const handleSubmit = () => {
    if (!newRequest.trim()) {
      Alert.alert("Erreur", "Veuillez décrire votre besoin");
      return;
    }

    const newDCI: DCIRequest = {
      id: Date.now().toString(),
      description: newRequest,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      offersCount: 0,
    };

    setRequests([newDCI, ...requests]);
    setNewRequest("");
    Alert.alert(
      "Demande envoyée",
      "Votre demande a été transmise aux professionnels concernés. Vous recevrez des offres sous peu."
    );
  };

  const getStatusColor = (status: DCIRequest["status"]) => {
    switch (status) {
      case "pending":
        return colors.accent;
      case "offers":
        return colors.secondary;
      case "completed":
        return colors.muted;
    }
  };

  const getStatusText = (status: DCIRequest["status"]) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "offers":
        return "Offres reçues";
      case "completed":
        return "Terminé";
    }
  };

  const renderRequest = ({ item }: { item: DCIRequest }) => (
    <TouchableOpacity
      style={[styles.requestCard, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
        <Text style={[styles.requestDate, { color: colors.muted }]}>{item.date}</Text>
      </View>
      <Text style={[styles.requestDescription, { color: colors.foreground }]}>
        {item.description}
      </Text>
      {item.status === "offers" && (
        <View style={[styles.offersContainer, { borderTopColor: colors.border }]}>
          <IconSymbol name="doc.text.fill" size={16} color={colors.secondary} />
          <Text style={[styles.offersText, { color: colors.secondary }]}>
            {item.offersCount} offre{item.offersCount > 1 ? "s" : ""} reçue{item.offersCount > 1 ? "s" : ""}
          </Text>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Démarche Citoyenne</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Exprimez votre besoin, recevez des offres
          </Text>
        </View>

        {/* New Request Form */}
        <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>
            Nouvelle demande
          </Text>
          <Text style={[styles.formHint, { color: colors.muted }]}>
            Décrivez votre besoin en quelques mots. Les professionnels concernés vous enverront leurs offres.
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Ex: Je cherche un électricien pour installer des prises dans mon garage..."
            placeholderTextColor={colors.muted}
            value={newRequest}
            onChangeText={setNewRequest}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#FFF" />
            <Text style={styles.submitButtonText}>Envoyer ma demande</Text>
          </TouchableOpacity>
        </View>

        {/* Requests List */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Mes demandes
          </Text>
          <FlatList
            data={requests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <IconSymbol name="message.fill" size={48} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  Aucune demande en cours
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  formContainer: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  formHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listSection: {
    flex: 1,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  requestCard: {
    padding: 16,
    borderRadius: 14,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  requestDate: {
    fontSize: 12,
  },
  requestDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  offersContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  offersText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
