/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useRef, useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { CAROUSEL_ITEMS, SHOPS, COMMUNAL_ALERTS, COMMUNAL_EVENTS } from "@/data/mock-data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeCarouselIndex + 1) % CAROUSEL_ITEMS.length;
      setActiveCarouselIndex(nextIndex);
      carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeCarouselIndex]);

  const quickActions = [
    { id: "shops", title: "Commerces", icon: "storefront.fill" as const, color: colors.secondary, route: "/shops" as Href },
    { id: "garages", title: "Garages", icon: "car.fill" as const, color: colors.accent, route: "/shops" as Href },
    { id: "dci", title: "Ma demande", icon: "message.fill" as const, color: colors.primary, route: "/dci" as Href },
    { id: "commune", title: "Commune", icon: "building.columns.fill" as const, color: colors.communal, route: "/commune" as Href },
    { id: "activities", title: "Activités", icon: "calendar.badge.plus" as const, color: "#7C3AED", route: "/activities" as Href },
  ];

  const promotionShops = SHOPS.filter((shop) => shop.hasPromotion);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Bienvenue sur</Text>
            <Text style={[styles.appName, { color: colors.foreground }]}>VilleConnect</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <IconSymbol name="bell.fill" size={22} color={colors.primary} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Rechercher un commerce, service..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={carouselRef}
            data={CAROUSEL_ITEMS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
              setActiveCarouselIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={[styles.carouselItem, { width: CAROUSEL_WIDTH }]}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.carouselImage}
                  contentFit="cover"
                />
                <View style={[styles.carouselOverlay, { backgroundColor: item.color + "CC" }]}>
                  <Text style={styles.carouselTitle}>{item.title}</Text>
                  <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
          {/* Pagination dots */}
          <View style={styles.paginationContainer}>
            {CAROUSEL_ITEMS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: index === activeCarouselIndex ? colors.primary : colors.border,
                    width: index === activeCarouselIndex ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Accès rapide</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
                onPress={() => router.push(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + "20" }]}>
                  <IconSymbol name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={[styles.quickActionTitle, { color: colors.foreground }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Alerts Section */}
        {COMMUNAL_ALERTS.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alertes</Text>
            {COMMUNAL_ALERTS.slice(0, 2).map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: colors.surface,
                    borderLeftColor: alert.type === "warning" ? colors.warning : colors.primary,
                  },
                ]}
              >
                <View style={styles.alertHeader}>
                  <IconSymbol
                    name={alert.type === "warning" ? "exclamationmark.triangle.fill" : "info.circle.fill"}
                    size={18}
                    color={alert.type === "warning" ? colors.warning : colors.primary}
                  />
                  <Text style={[styles.alertTitle, { color: colors.foreground }]}>{alert.title}</Text>
                </View>
                <Text style={[styles.alertMessage, { color: colors.muted }]} numberOfLines={2}>
                  {alert.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Events Section */}
        {COMMUNAL_EVENTS.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Prochains événements</Text>
              <TouchableOpacity onPress={() => router.push("/activities" as Href)}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {COMMUNAL_EVENTS.slice(0, 4).map((event) => {
                const d = new Date(event.date);
                const day = d.getDate().toString();
                const month = d.toLocaleDateString("fr-BE", { month: "short" }).toUpperCase();
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    onPress={() => router.push("/activities" as Href)}
                  >
                    <View style={[styles.eventDateBadge, { backgroundColor: colors.communal + "15" }]}>
                      <Text style={[styles.eventDay, { color: colors.communal }]}>{day}</Text>
                      <Text style={[styles.eventMonth, { color: colors.communal }]}>{month}</Text>
                    </View>
                    <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <View style={styles.eventMeta}>
                      <Text style={[styles.eventLocation, { color: colors.muted }]} numberOfLines={1}>
                        {event.location}
                      </Text>
                      {event.isFree && (
                        <View style={[styles.freeBadge, { backgroundColor: colors.secondary + "20" }]}>
                          <Text style={[styles.freeText, { color: colors.secondary }]}>Gratuit</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Promotions Section */}
        {promotionShops.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Promotions</Text>
              <TouchableOpacity onPress={() => router.push("/shops")}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {promotionShops.map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.promoCard, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: shop.image }} style={styles.promoImage} contentFit="cover" />
                  <View style={[styles.promoBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.promoBadgeText}>PROMO</Text>
                  </View>
                  <View style={styles.promoContent}>
                    <Text style={[styles.promoName, { color: colors.foreground }]} numberOfLines={1}>
                      {shop.name}
                    </Text>
                    <Text style={[styles.promoText, { color: colors.secondary }]} numberOfLines={1}>
                      {shop.promotionText}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  carouselContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  carouselItem: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  carouselOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  carouselTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  carouselSubtitle: {
    color: "#FFF",
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2 - 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  alertCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  promoCard: {
    width: 180,
    borderRadius: 14,
    marginRight: 12,
    overflow: "hidden",
  },
  promoImage: {
    width: "100%",
    height: 100,
  },
  promoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promoBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  promoContent: {
    padding: 12,
  },
  promoName: {
    fontSize: 14,
    fontWeight: "600",
  },
  promoText: {
    fontSize: 12,
    marginTop: 4,
  },
  eventCard: {
    width: 160,
    padding: 12,
    borderRadius: 14,
    marginRight: 10,
    gap: 8,
  },
  eventDateBadge: {
    width: 44,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  eventDay: {
    fontSize: 18,
    fontWeight: "800",
  },
  eventMonth: {
    fontSize: 9,
    fontWeight: "700",
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  eventMeta: {
    gap: 4,
  },
  eventLocation: {
    fontSize: 11,
  },
  freeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  freeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});