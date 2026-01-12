import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { Image } from "expo-image";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { GARAGES } from "@/data/mock-data";

export default function GarageDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const garage = GARAGES.find((g) => g.id === id);

  if (!garage) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ color: colors.foreground }}>Garage non trouvé</Text>
      </ScreenContainer>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${garage.phone}`);
  };

  const handleQuote = () => {
    Alert.alert(
      "Demande de devis",
      `Souhaitez-vous demander un devis à ${garage.name} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Demander",
          onPress: () =>
            Alert.alert("Demande envoyée", "Votre demande de devis a été transmise. Le garage vous contactera sous peu."),
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: garage.image }} style={styles.headerImage} contentFit="cover" />
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </TouchableOpacity>
          {garage.vehiclesCount > 0 && (
            <View style={[styles.vehicleBanner, { backgroundColor: colors.accent }]}>
              <IconSymbol name="car.fill" size={16} color="#FFF" />
              <Text style={styles.vehicleBannerText}>
                {garage.vehiclesCount} véhicule{garage.vehiclesCount > 1 ? "s" : ""} disponible{garage.vehiclesCount > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={[styles.garageName, { color: colors.foreground }]}>{garage.name}</Text>
              <View style={styles.ratingBadge}>
                <IconSymbol name="star.fill" size={16} color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.foreground }]}>{garage.rating}</Text>
              </View>
            </View>
            <View style={styles.specialtiesContainer}>
              {garage.specialties.map((specialty, index) => (
                <View
                  key={index}
                  style={[styles.specialtyBadge, { backgroundColor: colors.primary + "20" }]}
                >
                  <Text style={[styles.specialtyText, { color: colors.primary }]}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.description, { color: colors.foreground }]}>{garage.description}</Text>
          </View>

          {/* Info Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <IconSymbol name="location.fill" size={18} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{garage.address}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <IconSymbol name="clock.fill" size={18} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{garage.hours}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <IconSymbol name="phone.fill" size={18} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.accent }]}>{garage.phone}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Services */}
          {garage.services && garage.services.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services</Text>
              {garage.services.map((service) => (
                <View
                  key={service.id}
                  style={[styles.serviceCard, { backgroundColor: colors.surface }]}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: colors.accent + "20" }]}>
                    <IconSymbol name="wrench.fill" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, { color: colors.foreground }]}>
                      {service.name}
                    </Text>
                    <Text style={[styles.servicePrice, { color: colors.muted }]}>
                      {service.priceRange}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.quoteButton, { borderColor: colors.accent }]}
                    onPress={handleQuote}
                  >
                    <Text style={[styles.quoteButtonText, { color: colors.accent }]}>Devis</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.accent }]}
          onPress={handleCall}
        >
          <IconSymbol name="phone.fill" size={20} color={colors.accent} />
          <Text style={[styles.actionButtonText, { color: colors.accent }]}>Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton, { backgroundColor: colors.accent }]}
          onPress={handleQuote}
        >
          <IconSymbol name="doc.text.fill" size={20} color="#FFF" />
          <Text style={[styles.actionButtonText, { color: "#FFF" }]}>Demander un devis</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: 240,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleBanner: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  vehicleBannerText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  titleSection: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  garageName: {
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specialtyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    padding: 16,
    borderRadius: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600",
  },
  servicePrice: {
    fontSize: 13,
    marginTop: 2,
  },
  quoteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  quoteButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionBar: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
