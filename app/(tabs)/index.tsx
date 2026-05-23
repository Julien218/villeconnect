/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useRef, useState, useEffect } from "react";
import {
  ScrollView, Text, View, TextInput, FlatList,
  Dimensions, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";
import { trpc } from "@/lib/trpc";
// Fallback mock data (used when DB is empty or unavailable)
import { CAROUSEL_ITEMS, SHOPS as MOCK_SHOPS, COMMUNAL_ALERTS as MOCK_ALERTS, COMMUNAL_EVENTS as MOCK_EVENTS } from "@/data/mock-data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { postalCode, city, isLoggedIn, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // ── tRPC queries ──────────────────────────────────────────────────────────
  const { data: apiShops, isLoading: shopsLoading } = trpc.shops.list.useQuery(
    { postalCode: postalCode ?? undefined },
    { enabled: !!postalCode }
  );
  const { data: apiAlerts, isLoading: alertsLoading } = trpc.communal.alerts.useQuery(
    { postalCode: postalCode ?? undefined },
    { enabled: !!postalCode }
  );
  const { data: apiEvents, isLoading: eventsLoading } = trpc.events.list.useQuery(
    { postalCode: postalCode ?? undefined, upcoming: true },
    { enabled: !!postalCode }
  );

  // Use API data if available, fallback to mock
  const shops  = (apiShops  && apiShops.length  > 0) ? apiShops  : MOCK_SHOPS;
  const alerts = (apiAlerts && apiAlerts.length > 0) ? apiAlerts : MOCK_ALERTS;
  const events = (apiEvents && apiEvents.length > 0) ? apiEvents : MOCK_EVENTS;

  // Carousel auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      const next = (activeSlide + 1) % CAROUSEL_ITEMS.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveSlide(next);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSlide]);

  const quickActions = [
    { id: "shops",      title: "Commerces",  icon: "storefront.fill"       as const, color: colors.secondary,  route: "/(tabs)/shops"      as Href },
    { id: "dci",        title: "DCI",        icon: "message.fill"          as const, color: colors.primary,    route: "/(tabs)/dci"        as Href },
    { id: "commune",    title: "Commune",    icon: "building.columns.fill" as const, color: colors.communal,   route: "/(tabs)/commune"    as Href },
    { id: "activities", title: "Activités",  icon: "calendar.badge.plus"   as const, color: "#7C3AED",          route: "/(tabs)/activities" as Href },
  ];

  const s = styles(colors);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: colors.muted }]}>
              {user?.name ? `Bonjour, ${user.name} 👋` : "Bonjour 👋"}
            </Text>
            <Text style={[s.cityTitle, { color: colors.foreground }]}>
              {city ?? "Votre commune"}
            </Text>
            {postalCode && (
              <Text style={[s.postalBadge, { color: colors.muted }]}>📍 {postalCode}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.notifBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/profile" as Href)}
          >
            <IconSymbol name="bell.fill" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder={`Rechercher à ${city ?? "proximité"}...`}
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ── Alerts ──────────────────────────────────────────────────── */}
        {alertsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
        ) : alerts.slice(0, 1).map((alert: any) => (
          <View key={alert.id} style={[s.alertBanner, { backgroundColor: colors.error + "15", borderColor: colors.error + "30" }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: colors.error }]}>{alert.title}</Text>
              <Text style={[s.alertMsg, { color: colors.foreground }]} numberOfLines={2}>
                {alert.message}
              </Text>
            </View>
          </View>
        ))}

        {/* ── Carousel ────────────────────────────────────────────────── */}
        <View style={s.carouselWrap}>
          <FlatList
            ref={flatListRef}
            data={CAROUSEL_ITEMS}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CAROUSEL_WIDTH + 12}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (CAROUSEL_WIDTH + 12));
              setActiveSlide(idx);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity style={[s.carouselCard, { backgroundColor: colors.surface, width: CAROUSEL_WIDTH }]} activeOpacity={0.85}>
                <Image source={{ uri: item.image }} style={s.carouselImg} contentFit="cover" />
                <View style={s.carouselOverlay}>
                  <Text style={s.carouselTitle}>{item.title}</Text>
                  <Text style={s.carouselSub} numberOfLines={2}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
          {/* Dots */}
          <View style={s.dots}>
            {CAROUSEL_ITEMS.map((_, i) => (
              <View key={i} style={[s.dot, { backgroundColor: i === activeSlide ? colors.primary : colors.border }]} />
            ))}
          </View>
        </View>

        {/* ── Quick Actions ────────────────────────────────────────────── */}
        <View style={s.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[s.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(a.route)}
            >
              <View style={[s.quickIcon, { backgroundColor: a.color + "18" }]}>
                <IconSymbol name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={[s.quickLabel, { color: colors.foreground }]}>{a.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Prochains événements ─────────────────────────────────────── */}
        {events.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>Prochains événements</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/activities" as Href)}>
                <Text style={[s.seeAll, { color: colors.primary }]}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {eventsLoading ? (
              <ActivityIndicator color={colors.communal} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(events as any[]).slice(0, 4).map((ev) => {
                  const d = new Date(ev.dateStart ?? ev.date);
                  const day = d.getDate().toString();
                  const mon = d.toLocaleDateString("fr-BE", { month: "short" }).toUpperCase();
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={[s.eventCard, { backgroundColor: colors.surface }]}
                      onPress={() => router.push("/(tabs)/activities" as Href)}
                    >
                      <View style={[s.eventDate, { backgroundColor: colors.communal + "15" }]}>
                        <Text style={[s.eventDay, { color: colors.communal }]}>{day}</Text>
                        <Text style={[s.eventMon, { color: colors.communal }]}>{mon}</Text>
                      </View>
                      <Text style={[s.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
                        {ev.title}
                      </Text>
                      <Text style={[s.eventLoc, { color: colors.muted }]} numberOfLines={1}>
                        {ev.location}
                      </Text>
                      {(ev.isFree === true || ev.isFree === 1) && (
                        <View style={[s.freeBadge, { backgroundColor: colors.secondary + "20" }]}>
                          <Text style={[s.freeText, { color: colors.secondary }]}>Gratuit</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── Commerces proches ────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Commerces proches</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/shops" as Href)}>
              <Text style={[s.seeAll, { color: colors.primary }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {shopsLoading ? (
            <ActivityIndicator color={colors.secondary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(shops as any[]).slice(0, 5).map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[s.shopCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push("/(tabs)/shops" as Href)}
                >
                  <Image source={{ uri: shop.image ?? shop.imageUrl }} style={s.shopImg} contentFit="cover" />
                  {(shop.hasPromotion || shop.has_promotion) && (
                    <View style={[s.promoBadge, { backgroundColor: colors.accent }]}>
                      <Text style={s.promoText}>Promo</Text>
                    </View>
                  )}
                  <View style={s.shopInfo}>
                    <Text style={[s.shopName, { color: colors.foreground }]} numberOfLines={1}>{shop.name}</Text>
                    <Text style={[s.shopCat, { color: colors.muted }]}>{shop.category}</Text>
                    <View style={s.ratingRow}>
                      <Text style={{ fontSize: 11 }}>⭐</Text>
                      <Text style={[s.ratingText, { color: colors.muted }]}>
                        {Number(shop.rating ?? 0).toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (colors: any) => StyleSheet.create({
  scroll:        { paddingBottom: 40 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  greeting:      { fontSize: 14, fontWeight: "500" },
  cityTitle:     { fontSize: 26, fontWeight: "800", marginTop: 2 },
  postalBadge:   { fontSize: 12, marginTop: 2 },
  notifBtn:      { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  searchBar:     { flexDirection: "row", alignItems: "center", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 14 },
  searchInput:   { flex: 1, fontSize: 15 },
  alertBanner:   { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 16, marginBottom: 14, padding: 12, borderRadius: 12, borderWidth: 1 },
  alertTitle:    { fontSize: 13, fontWeight: "700" },
  alertMsg:      { fontSize: 12, marginTop: 2, lineHeight: 17 },
  carouselWrap:  { paddingLeft: 16, marginBottom: 20 },
  carouselCard:  { borderRadius: 16, overflow: "hidden", marginRight: 12, height: 180 },
  carouselImg:   { width: "100%", height: "100%" },
  carouselOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: "rgba(0,0,0,0.45)" },
  carouselTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  carouselSub:   { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 3 },
  dots:          { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot:           { width: 6, height: 6, borderRadius: 3 },
  quickGrid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, marginBottom: 24 },
  quickCard:     { flex: 1, minWidth: "44%", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  quickIcon:     { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  quickLabel:    { fontSize: 13, fontWeight: "600" },
  section:       { marginHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle:  { fontSize: 18, fontWeight: "700" },
  seeAll:        { fontSize: 13, fontWeight: "600" },
  eventCard:     { width: 148, padding: 12, borderRadius: 14, marginRight: 10, gap: 6 },
  eventDate:     { width: 42, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  eventDay:      { fontSize: 17, fontWeight: "800", lineHeight: 20 },
  eventMon:      { fontSize: 9, fontWeight: "700" },
  eventTitle:    { fontSize: 13, fontWeight: "600", lineHeight: 17 },
  eventLoc:      { fontSize: 11 },
  freeBadge:     { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  freeText:      { fontSize: 10, fontWeight: "600" },
  shopCard:      { width: 140, borderRadius: 14, overflow: "hidden", marginRight: 10 },
  shopImg:       { width: "100%", height: 90 },
  promoBadge:    { position: "absolute", top: 8, right: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  promoText:     { color: "#fff", fontSize: 10, fontWeight: "700" },
  shopInfo:      { padding: 10, gap: 3 },
  shopName:      { fontSize: 13, fontWeight: "700" },
  shopCat:       { fontSize: 11 },
  ratingRow:     { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText:    { fontSize: 11 },
});
