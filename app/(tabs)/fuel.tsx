/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState, useEffect } from "react";
import {
  Text, View, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Linking, ActivityIndicator,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Station {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  postalCode: string;
  distance: number; // km
  prices: {
    e5: number | null;
    e10: number | null;
    b7: number | null;
    gpl: number | null;
  };
  updatedAt: string;
  isOpen: boolean;
  lat: number;
  lng: number;
}

// ─── Mock data Dour & environs ────────────────────────────────────────────────

const STATIONS_MOCK: Station[] = [
  {
    id: "1", name: "Total Energies Dour", brand: "TotalEnergies",
    address: "Rue de Mons 12", city: "Dour", postalCode: "7370",
    distance: 0.4, isOpen: true, lat: 50.3957, lng: 3.7784,
    updatedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    prices: { e5: 1.729, e10: 1.649, b7: 1.589, gpl: 0.789 },
  },
  {
    id: "2", name: "Texaco Boussu", brand: "Texaco",
    address: "Chaussée de Mons 88", city: "Boussu", postalCode: "7300",
    distance: 2.1, isOpen: true, lat: 50.4324, lng: 3.7956,
    updatedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    prices: { e5: 1.709, e10: 1.629, b7: 1.569, gpl: null },
  },
  {
    id: "3", name: "Intermarché Saint-Ghislain", brand: "Intermarché",
    address: "Rue du Roi Albert 5", city: "Saint-Ghislain", postalCode: "7330",
    distance: 3.8, isOpen: true, lat: 50.4534, lng: 3.8192,
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    prices: { e5: 1.689, e10: 1.609, b7: 1.549, gpl: 0.769 },
  },
  {
    id: "4", name: "Q8 Mons Centre", brand: "Q8",
    address: "Avenue du Tir 3", city: "Mons", postalCode: "7000",
    distance: 7.2, isOpen: false, lat: 50.4542, lng: 3.9523,
    updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    prices: { e5: 1.699, e10: 1.619, b7: 1.579, gpl: null },
  },
  {
    id: "5", name: "Carrefour Hornu", brand: "Carrefour",
    address: "Rue du Grand Hornu 100", city: "Hornu", postalCode: "7301",
    distance: 4.5, isOpen: true, lat: 50.4123, lng: 3.8234,
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    prices: { e5: 1.695, e10: 1.615, b7: 1.555, gpl: 0.775 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FUEL_LABELS: Record<string, string> = {
  e5: "SP95 E5", e10: "SP95 E10", b7: "Diesel B7", gpl: "GPL",
};

const BRAND_COLORS: Record<string, string> = {
  TotalEnergies: "#FF0000", Texaco: "#CC0000", Intermarché: "#E30A17",
  Q8: "#FFD700", Carrefour: "#004A96", default: "#6B7280",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 2)  return "À l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  return `il y a ${Math.floor(diff / 60)}h`;
}

function cheapest(stations: Station[], fuel: "e5" | "e10" | "b7" | "gpl"): Station | null {
  const filtered = stations.filter(s => s.prices[fuel] !== null && s.isOpen);
  if (!filtered.length) return null;
  return filtered.reduce((a, b) => (a.prices[fuel]! < b.prices[fuel]! ? a : b));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuelScreen() {
  const colors = useColors();
  const { city, postalCode } = useAuth();
  const [stations, setStations] = useState<Station[]>(STATIONS_MOCK);
  const [selectedFuel, setSelectedFuel] = useState<"e5" | "e10" | "b7" | "gpl">("b7");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"price" | "distance">("price");

  const bestStation = cheapest(stations, selectedFuel);

  const sorted = [...stations].sort((a, b) => {
    if (sortBy === "price") {
      const pa = a.prices[selectedFuel] ?? 9999;
      const pb = b.prices[selectedFuel] ?? 9999;
      return pa - pb;
    }
    return a.distance - b.distance;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const openMap = (s: Station) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
    Linking.openURL(url);
  };

  const s = styles(colors);

  const savings = bestStation && stations[0]
    ? ((stations.find(st => st.prices[selectedFuel] !== null)?.prices[selectedFuel] ?? 0) - (bestStation.prices[selectedFuel] ?? 0)) * 50
    : 0;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.foreground }]}>Carburant ⛽</Text>
          <Text style={[s.subtitle, { color: colors.muted }]}>
            Prix en temps réel{city ? ` autour de ${city}` : ""}
          </Text>
        </View>

        {/* AI Saving Banner */}
        {bestStation && (
          <View style={[s.savingBanner, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "30" }]}>
            <View style={s.savingLeft}>
              <Text style={{ fontSize: 28 }}>🤖</Text>
              <View>
                <Text style={[s.savingTitle, { color: colors.foreground }]}>
                  Meilleur prix — {FUEL_LABELS[selectedFuel]}
                </Text>
                <Text style={[s.savingStation, { color: colors.secondary }]}>
                  {bestStation.name} • {bestStation.prices[selectedFuel]?.toFixed(3)} €/L
                </Text>
                {savings > 0.01 && (
                  <Text style={[s.savingEco, { color: colors.muted }]}>
                    Économie estimée : ~{savings.toFixed(2)} € / plein (50L)
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[s.navBtn, { backgroundColor: colors.secondary }]}
              onPress={() => openMap(bestStation)}
            >
              <IconSymbol name="location.fill" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Fuel selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.fuelScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {(["b7", "e10", "e5", "gpl"] as const).map(fuel => (
            <TouchableOpacity
              key={fuel}
              style={[s.fuelChip, {
                backgroundColor: selectedFuel === fuel ? colors.primary : colors.surface,
                borderColor: selectedFuel === fuel ? colors.primary : colors.border,
              }]}
              onPress={() => setSelectedFuel(fuel)}
            >
              <Text style={[s.fuelChipText, { color: selectedFuel === fuel ? "#fff" : colors.foreground }]}>
                {FUEL_LABELS[fuel]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <View style={s.sortRow}>
          <Text style={[s.sortLabel, { color: colors.muted }]}>Trier par :</Text>
          {["price", "distance"].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.sortChip, { backgroundColor: sortBy === opt ? colors.primary + "18" : "transparent" }]}
              onPress={() => setSortBy(opt as any)}
            >
              <Text style={[s.sortChipText, { color: sortBy === opt ? colors.primary : colors.muted }]}>
                {opt === "price" ? "💰 Prix" : "📍 Distance"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stations list */}
        <View style={s.stationsList}>
          {sorted.map((station, idx) => {
            const price = station.prices[selectedFuel];
            const isBest = bestStation?.id === station.id;
            const brandColor = BRAND_COLORS[station.brand] ?? BRAND_COLORS.default;
            return (
              <View key={station.id} style={[s.card, { backgroundColor: colors.surface, borderColor: isBest ? colors.secondary : "transparent", borderWidth: isBest ? 2 : 0 }]}>
                <View style={s.cardTop}>
                  <View style={[s.brandDot, { backgroundColor: brandColor }]} />
                  <View style={{ flex: 1 }}>
                    <View style={s.cardTitleRow}>
                      <Text style={[s.cardName, { color: colors.foreground }]} numberOfLines={1}>{station.name}</Text>
                      {isBest && (
                        <View style={[s.bestBadge, { backgroundColor: colors.secondary + "20" }]}>
                          <Text style={[s.bestText, { color: colors.secondary }]}>✓ Moins cher</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.cardAddr, { color: colors.muted }]}>{station.address} • {station.distance} km</Text>
                  </View>
                  <View style={s.cardRight}>
                    {price !== null ? (
                      <Text style={[s.priceText, { color: isBest ? colors.secondary : colors.foreground }]}>
                        {price.toFixed(3)} €
                      </Text>
                    ) : (
                      <Text style={[s.priceText, { color: colors.muted }]}>N/D</Text>
                    )}
                    <Text style={[s.perLiter, { color: colors.muted }]}>/litre</Text>
                  </View>
                </View>

                {/* All prices row */}
                <View style={[s.allPricesRow, { borderTopColor: colors.border }]}>
                  {(["e5","e10","b7","gpl"] as const).map(f => (
                    <View key={f} style={[s.priceCell, { backgroundColor: f === selectedFuel ? colors.primary + "10" : "transparent" }]}>
                      <Text style={[s.priceCellLabel, { color: colors.muted }]}>{FUEL_LABELS[f].split(" ")[0]}</Text>
                      <Text style={[s.priceCellVal, { color: f === selectedFuel ? colors.primary : colors.foreground }]}>
                        {station.prices[f] !== null ? station.prices[f]!.toFixed(3) : "—"}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={[s.cardActions, { borderTopColor: colors.border }]}>
                  <View style={s.updateRow}>
                    <View style={[s.openDot, { backgroundColor: station.isOpen ? colors.secondary : colors.error }]} />
                    <Text style={[s.openText, { color: colors.muted }]}>
                      {station.isOpen ? "Ouvert" : "Fermé"} • MAJ {timeAgo(station.updatedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity style={[s.mapBtn, { backgroundColor: colors.primary + "15" }]} onPress={() => openMap(station)}>
                    <IconSymbol name="map.fill" size={14} color={colors.primary} />
                    <Text style={[s.mapBtnText, { color: colors.primary }]}>Itinéraire</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[s.disclaimer, { color: colors.muted }]}>
          ℹ️ Prix indicatifs mis à jour par les utilisateurs. Vérifiez sur place.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (c: any) => StyleSheet.create({
  header:         { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title:          { fontSize: 28, fontWeight: "800" },
  subtitle:       { fontSize: 14, marginTop: 4 },
  savingBanner:   { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  savingLeft:     { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  savingTitle:    { fontSize: 13, fontWeight: "700" },
  savingStation:  { fontSize: 15, fontWeight: "800", marginTop: 1 },
  savingEco:      { fontSize: 11, marginTop: 2 },
  navBtn:         { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fuelScroll:     { marginBottom: 12 },
  fuelChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  fuelChipText:   { fontSize: 13, fontWeight: "600" },
  sortRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  sortLabel:      { fontSize: 13 },
  sortChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  sortChipText:   { fontSize: 13, fontWeight: "500" },
  stationsList:   { paddingHorizontal: 16, gap: 12 },
  card:           { borderRadius: 16, overflow: "hidden" },
  cardTop:        { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  brandDot:       { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  cardTitleRow:   { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  cardName:       { fontSize: 14, fontWeight: "700", flex: 1 },
  bestBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  bestText:       { fontSize: 10, fontWeight: "700" },
  cardAddr:       { fontSize: 12, marginTop: 2 },
  cardRight:      { alignItems: "flex-end" },
  priceText:      { fontSize: 20, fontWeight: "800" },
  perLiter:       { fontSize: 10 },
  allPricesRow:   { flexDirection: "row", borderTopWidth: 1, paddingVertical: 8 },
  priceCell:      { flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: 8 },
  priceCellLabel: { fontSize: 10, fontWeight: "500" },
  priceCellVal:   { fontSize: 13, fontWeight: "700", marginTop: 2 },
  cardActions:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  updateRow:      { flexDirection: "row", alignItems: "center", gap: 5 },
  openDot:        { width: 7, height: 7, borderRadius: 4 },
  openText:       { fontSize: 11 },
  mapBtn:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  mapBtnText:     { fontSize: 13, fontWeight: "600" },
  disclaimer:     { textAlign: "center", fontSize: 11, marginTop: 16, marginHorizontal: 16 },
});
