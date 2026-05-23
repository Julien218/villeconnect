/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text, View, TextInput, FlatList,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";
import { trpc } from "@/lib/trpc";
import { SHOPS as MOCK_SHOPS, GARAGES as MOCK_GARAGES, SHOP_CATEGORIES } from "@/data/mock-data";

type TabType = "shops" | "garages";

export default function ShopsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { postalCode } = useAuth();
  const [activeTab, setActiveTab]       = useState<TabType>("shops");
  const [searchQuery, setSearchQuery]   = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  // ── API calls ──────────────────────────────────────────────────────────────
  const { data: apiShops, isLoading: shopsLoading } = trpc.shops.list.useQuery(
    { postalCode: postalCode ?? undefined,
      category: selectedCategory !== "Tous" ? selectedCategory : undefined },
    { enabled: true }
  );
  const { data: apiGarages, isLoading: garagesLoading } = trpc.garages.list.useQuery(
    { postalCode: postalCode ?? undefined },
    { enabled: true }
  );

  const shops   = (apiShops   && apiShops.length   > 0) ? apiShops   : MOCK_SHOPS;
  const garages = (apiGarages && apiGarages.length > 0) ? apiGarages : MOCK_GARAGES;

  const filteredShops = (shops as any[]).filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    const matchC = selectedCategory === "Tous" || s.category === selectedCategory;
    return matchQ && matchC;
  });

  const filteredGarages = (garages as any[]).filter((g) => {
    const q = searchQuery.toLowerCase();
    return !q || g.name.toLowerCase().includes(q) ||
      (g.specialty ?? "").toLowerCase().includes(q) ||
      (g.specialties ?? []).some((sp: string) => sp.toLowerCase().includes(q));
  });

  const s = styles(colors);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.foreground }]}>Commerces</Text>
        <Text style={[s.sub, { color: colors.muted }]}>
          {activeTab === "shops"
            ? `${filteredShops.length} commerces`
            : `${filteredGarages.length} garages & artisans`}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(["shops", "garages"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <IconSymbol
              name={tab === "shops" ? "storefront.fill" : "wrench.fill"}
              size={16}
              color={activeTab === tab ? "#fff" : colors.muted}
            />
            <Text style={[s.tabText, { color: activeTab === tab ? "#fff" : colors.muted }]}>
              {tab === "shops" ? "Commerces" : "Garages & Artisans"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[s.searchInput, { color: colors.foreground }]}
          placeholder="Rechercher..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips — shops only */}
      {activeTab === "shops" && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["Tous", ...SHOP_CATEGORIES]}
          keyExtractor={(item) => item}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.chip, {
                backgroundColor: selectedCategory === item ? colors.secondary : colors.surface,
                borderColor: selectedCategory === item ? colors.secondary : colors.border,
              }]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[s.chipText, { color: selectedCategory === item ? "#fff" : colors.muted }]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Loading */}
      {(activeTab === "shops" ? shopsLoading : garagesLoading) && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Shop list */}
      {activeTab === "shops" && !shopsLoading && (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: shop }) => (
            <TouchableOpacity style={[s.shopCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image source={{ uri: shop.image ?? shop.imageUrl }} style={s.shopImg} contentFit="cover" />
              {(shop.hasPromotion || shop.has_promotion) && shop.promotionText && (
                <View style={[s.promoBanner, { backgroundColor: colors.accent + "F0" }]}>
                  <Text style={s.promoText} numberOfLines={1}>{shop.promotionText}</Text>
                </View>
              )}
              <View style={s.shopBody}>
                <View style={s.shopTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.shopName, { color: colors.foreground }]}>{shop.name}</Text>
                    <View style={[s.catBadge, { backgroundColor: colors.secondary + "18" }]}>
                      <Text style={[s.catText, { color: colors.secondary }]}>{shop.category}</Text>
                    </View>
                  </View>
                  <View style={s.ratingBadge}>
                    <Text style={{ fontSize: 12 }}>⭐</Text>
                    <Text style={[s.ratingText, { color: colors.foreground }]}>
                      {Number(shop.rating ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Text style={[s.shopDesc, { color: colors.muted }]} numberOfLines={2}>
                  {shop.description}
                </Text>
                <View style={s.metaRow}>
                  <IconSymbol name="location.fill" size={12} color={colors.muted} />
                  <Text style={[s.metaText, { color: colors.muted }]}>{shop.address}</Text>
                </View>
                <View style={s.metaRow}>
                  <IconSymbol name="phone.fill" size={12} color={colors.muted} />
                  <Text style={[s.metaText, { color: colors.muted }]}>{shop.phone}</Text>
                </View>
                <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.secondary }]}>
                  <Text style={s.ctaText}>Voir la vitrine</Text>
                  <IconSymbol name="chevron.right" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Garage list */}
      {activeTab === "garages" && !garagesLoading && (
        <FlatList
          data={filteredGarages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: garage }) => (
            <TouchableOpacity style={[s.shopCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image source={{ uri: garage.image ?? garage.imageUrl }} style={s.shopImg} contentFit="cover" />
              <View style={s.shopBody}>
                <View style={s.shopTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.shopName, { color: colors.foreground }]}>{garage.name}</Text>
                    <View style={[s.catBadge, { backgroundColor: colors.accent + "18" }]}>
                      <Text style={[s.catText, { color: colors.accent }]}>
                        {garage.specialty ?? (garage.specialties ?? []).join(", ")}
                      </Text>
                    </View>
                  </View>
                  <View style={s.ratingBadge}>
                    <Text style={{ fontSize: 12 }}>⭐</Text>
                    <Text style={[s.ratingText, { color: colors.foreground }]}>
                      {Number(garage.rating ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Text style={[s.shopDesc, { color: colors.muted }]} numberOfLines={2}>
                  {garage.description}
                </Text>
                <View style={s.metaRow}>
                  <IconSymbol name="location.fill" size={12} color={colors.muted} />
                  <Text style={[s.metaText, { color: colors.muted }]}>{garage.address}</Text>
                </View>
                <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.accent }]}>
                  <Text style={s.ctaText}>Demander un devis</Text>
                  <IconSymbol name="chevron.right" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = (colors: any) => StyleSheet.create({
  header:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title:       { fontSize: 28, fontWeight: "800" },
  sub:         { fontSize: 13, marginTop: 2 },
  tabRow:      { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  tab:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 9 },
  tabText:     { fontSize: 13, fontWeight: "600" },
  searchBar:   { flexDirection: "row", alignItems: "center", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  chips:       { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  chipText:    { fontSize: 12, fontWeight: "500" },
  list:        { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  shopCard:    { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  shopImg:     { width: "100%", height: 140 },
  promoBanner: { paddingHorizontal: 12, paddingVertical: 6 },
  promoText:   { color: "#fff", fontSize: 12, fontWeight: "700" },
  shopBody:    { padding: 14, gap: 8 },
  shopTopRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  shopName:    { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  catBadge:    { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  catText:     { fontSize: 11, fontWeight: "600" },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText:  { fontSize: 14, fontWeight: "700" },
  shopDesc:    { fontSize: 13, lineHeight: 19 },
  metaRow:     { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:    { fontSize: 12, flex: 1 },
  ctaBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 11, gap: 6, marginTop: 4 },
  ctaText:     { color: "#fff", fontSize: 14, fontWeight: "600" },
});
