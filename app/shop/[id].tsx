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
import { SHOPS } from "@/data/mock-data";

export default function ShopDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const shop = SHOPS.find((s) => s.id === id);

  if (!shop) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ color: colors.foreground }}>Commerce non trouvé</Text>
      </ScreenContainer>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${shop.phone}`);
  };

  const handleAppointment = () => {
    Alert.alert(
      "Prendre rendez-vous",
      `Souhaitez-vous prendre rendez-vous chez ${shop.name} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Appeler", onPress: handleCall },
      ]
    );
  };

  return (
    <ScreenContainer edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: shop.image }} style={styles.headerImage} contentFit="cover" />
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.foreground} style={{ transform: [{ rotate: "180deg" }] }} />
          </TouchableOpacity>
          {shop.hasPromotion && (
            <View style={[styles.promoBanner, { backgroundColor: colors.error }]}>
              <IconSymbol name="tag.fill" size={14} color="#FFF" />
              <Text style={styles.promoBannerText}>{shop.promotionText}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={[styles.shopName, { color: colors.foreground }]}>{shop.name}</Text>
              <View style={styles.ratingBadge}>
                <IconSymbol name="star.fill" size={16} color={colors.accent} />
                <Text style={[styles.ratingText, { color: colors.foreground }]}>{shop.rating}</Text>
              </View>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>{shop.category}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.description, { color: colors.foreground }]}>{shop.description}</Text>
          </View>

          {/* Info Card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <IconSymbol name="location.fill" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{shop.address}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <IconSymbol name="clock.fill" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{shop.hours}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <IconSymbol name="phone.fill" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>{shop.phone}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Products */}
          {shop.products && shop.products.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Produits</Text>
              {shop.products.map((product) => (
                <View
                  key={product.id}
                  style={[styles.productCard, { backgroundColor: colors.surface }]}
                >
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.foreground }]}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productDescription, { color: colors.muted }]}>
                      {product.description}
                    </Text>
                  </View>
                  <Text style={[styles.productPrice, { color: colors.secondary }]}>
                    {product.price.toFixed(2)}€
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={handleCall}
        >
          <IconSymbol name="phone.fill" size={20} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleAppointment}
        >
          <IconSymbol name="calendar" size={20} color="#FFF" />
          <Text style={[styles.actionButtonText, { color: "#FFF" }]}>Rendez-vous</Text>
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
  promoBanner: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  promoBannerText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  titleSection: {
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shopName: {
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
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
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
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
  },
  productDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
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
