import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { SHOPS, GARAGES, SHOP_CATEGORIES, type Shop, type Garage } from "@/data/mock-data";

type TabType = "shops" | "garages";

export default function ShopsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("shops");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  const filteredShops = SHOPS.filter((shop) => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || shop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredGarages = GARAGES.filter((garage) =>
    garage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    garage.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderShopCard = ({ item }: { item: Shop }) => (
    <TouchableOpacity
      style={[styles.shopCard, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/shop/${item.id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.shopImage} contentFit="cover" />
      {item.hasPromotion && (
        <View style={[styles.promoBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.promoBadgeText}>PROMO</Text>
        </View>
      )}
      <View style={styles.shopContent}>
        <View style={styles.shopHeader}>
          <Text style={[styles.shopName, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.ratingContainer}>
            <IconSymbol name="star.fill" size={14} color={colors.accent} />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating}</Text>
          </View>
        </View>
        <Text style={[styles.shopCategory, { color: colors.primary }]}>{item.category}</Text>
        <View style={styles.shopInfo}>
          <IconSymbol name="location.fill" size={12} color={colors.muted} />
          <Text style={[styles.shopAddress, { color: colors.muted }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        {item.hasPromotion && item.promotionText && (
          <Text style={[styles.promoText, { color: colors.secondary }]} numberOfLines={1}>
            {item.promotionText}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderGarageCard = ({ item }: { item: Garage }) => (
    <TouchableOpacity
      style={[styles.shopCard, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/garage/${item.id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.shopImage} contentFit="cover" />
      {item.vehiclesCount > 0 && (
        <View style={[styles.vehicleBadge, { backgroundColor: colors.accent }]}>
          <IconSymbol name="car.fill" size={12} color="#FFF" />
          <Text style={styles.vehicleBadgeText}>{item.vehiclesCount}</Text>
        </View>
      )}
      <View style={styles.shopContent}>
        <View style={styles.shopHeader}>
          <Text style={[styles.shopName, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.ratingContainer}>
            <IconSymbol name="star.fill" size={14} color={colors.accent} />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.specialtiesContainer}>
          {item.specialties.slice(0, 2).map((specialty, index) => (
            <View key={index} style={[styles.specialtyBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.specialtyText, { color: colors.primary }]}>{specialty}</Text>
            </View>
          ))}
        </View>
        <View style={styles.shopInfo}>
          <IconSymbol name="location.fill" size={12} color={colors.muted} />
          <Text style={[styles.shopAddress, { color: colors.muted }]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {activeTab === "shops" ? "Commerces" : "Garages & Artisans"}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "shops" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("shops")}
        >
          <IconSymbol
            name="storefront.fill"
            size={18}
            color={activeTab === "shops" ? "#FFF" : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "shops" ? "#FFF" : colors.muted },
            ]}
          >
            Commerces
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "garages" && { backgroundColor: colors.accent },
          ]}
          onPress={() => setActiveTab("garages")}
        >
          <IconSymbol
            name="car.fill"
            size={18}
            color={activeTab === "garages" ? "#FFF" : colors.muted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "garages" ? "#FFF" : colors.muted },
            ]}
          >
            Garages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder={activeTab === "shops" ? "Rechercher un commerce..." : "Rechercher un garage..."}
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      {/* Categories (only for shops) */}
      {activeTab === "shops" && (
        <View style={styles.categoriesContainer}>
          <FlatList
            data={SHOP_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === item ? colors.primary : colors.surface,
                    borderColor: selectedCategory === item ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === item ? "#FFF" : colors.foreground },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
          />
        </View>
      )}

      {/* List */}
      <FlatList
        data={(activeTab === "shops" ? filteredShops : filteredGarages) as any}
        renderItem={activeTab === "shops" ? renderShopCard : (renderGarageCard as any)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol
              name={activeTab === "shops" ? "storefront.fill" : "car.fill"}
              size={48}
              color={colors.muted}
            />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Aucun résultat trouvé
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
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
  categoriesContainer: {
    marginTop: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  shopCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  shopImage: {
    width: "100%",
    height: 140,
  },
  promoBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promoBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  vehicleBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  vehicleBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  shopContent: {
    padding: 14,
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shopName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  shopCategory: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  shopAddress: {
    fontSize: 13,
    flex: 1,
  },
  promoText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  specialtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
