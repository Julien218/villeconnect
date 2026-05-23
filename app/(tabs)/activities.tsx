/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState, useMemo } from "react";
import {
  Text, View, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";
import { trpc } from "@/lib/trpc";
import { COMMUNAL_EVENTS as MOCK_EVENTS } from "@/data/mock-data";

type EventCategory = "Tous"|"Culture"|"Sport"|"Marché"|"Jeunesse"|"Environnement"|"Communal";
const CATEGORIES: EventCategory[] = ["Tous","Culture","Sport","Marché","Jeunesse","Environnement","Communal"];
const CAT_ICONS: Record<EventCategory, any> = {
  Tous: "star.fill", Culture: "paintpalette.fill", Sport: "sportscourt.fill",
  Marché: "basket.fill", Jeunesse: "figure.play",
  Environnement: "leaf.fill", Communal: "building.columns.fill",
};

function getDayMonth(d: Date) {
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString("fr-BE", { month: "short" }).toUpperCase(),
  };
}

export default function ActivitiesScreen() {
  const colors = useColors();
  const { postalCode } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("Tous");
  const [searchQuery, setSearchQuery]           = useState("");
  const [reminders, setReminders]               = useState<Set<string | number>>(new Set());
  const [viewMode, setViewMode]                 = useState<"list"|"calendar">("list");

  // ── tRPC queries ─────────────────────────────────────────────────────────
  const { data: apiEvents, isLoading, refetch } = trpc.events.list.useQuery(
    { postalCode: postalCode ?? undefined,
      category: selectedCategory !== "Tous" ? selectedCategory : undefined,
      upcoming: true },
    { enabled: true }
  );
  const remindMutation = trpc.events.remind.useMutation();

  const events = (apiEvents && apiEvents.length > 0) ? apiEvents : MOCK_EVENTS as any[];

  const filtered = useMemo(() => {
    return events.filter((e: any) => {
      const matchCat = selectedCategory === "Tous" || e.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQ = !q || e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (JSON.parse(e.tags ?? "[]") as string[]).some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [events, selectedCategory, searchQuery]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc: any, ev: any) => {
      const d = new Date(ev.dateStart ?? ev.date);
      const key = d.toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filtered]);

  const toggleReminder = async (eventId: string | number, title: string) => {
    setReminders((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        Alert.alert("Rappel supprimé", `Rappel annulé pour « ${title} »`);
      } else {
        next.add(eventId);
        Alert.alert("Rappel activé ✓", `Vous serez notifié avant « ${title} »`, [{ text: "OK" }]);
        if (typeof eventId === "number") {
          remindMutation.mutate({ eventId });
        }
      }
      return next;
    });
  };

  const s = styles(colors);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} stickyHeaderIndices={[0]}>

        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <View style={[s.sticky, { backgroundColor: colors.background }]}>
          <View style={s.titleRow}>
            <View>
              <Text style={[s.title, { color: colors.foreground }]}>Activités</Text>
              <Text style={[s.sub, { color: colors.muted }]}>
                {filtered.length} événement{filtered.length > 1 ? "s" : ""} à venir
              </Text>
            </View>
            <View style={[s.viewSwitch, { backgroundColor: colors.surface }]}>
              {(["list","calendar"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.viewBtn, viewMode === m && { backgroundColor: colors.primary }]}
                  onPress={() => setViewMode(m)}
                >
                  <IconSymbol name={m === "list" ? "list.bullet" : "calendar"} size={18} color={viewMode === m ? "#fff" : colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              style={[s.searchInput, { color: colors.foreground }]}
              placeholder="Rechercher..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cats}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.catChip, {
                  backgroundColor: selectedCategory === cat ? colors.communal : colors.surface,
                  borderColor: selectedCategory === cat ? colors.communal : colors.border,
                }]}
                onPress={() => setSelectedCategory(cat)}
              >
                <IconSymbol name={CAT_ICONS[cat]} size={13} color={selectedCategory === cat ? "#fff" : colors.muted} />
                <Text style={[s.catText, { color: selectedCategory === cat ? "#fff" : colors.foreground }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isLoading && <ActivityIndicator color={colors.communal} style={{ marginTop: 40 }} />}

        {/* ── List view ─────────────────────────────────────────────────── */}
        {!isLoading && viewMode === "list" && (
          <View style={{ paddingTop: 8 }}>
            {Object.keys(grouped).length === 0 ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>📭</Text>
                <Text style={[s.emptyTitle, { color: colors.foreground }]}>Aucun événement</Text>
                <Text style={[s.emptySub, { color: colors.muted }]}>Essayez une autre catégorie.</Text>
              </View>
            ) : Object.entries(grouped).map(([month, evs]) => (
              <View key={month}>
                <View style={s.monthHeader}>
                  <View style={[s.monthLine, { backgroundColor: colors.border }]} />
                  <Text style={[s.monthLabel, { color: colors.muted }]}>{month.toUpperCase()}</Text>
                  <View style={[s.monthLine, { backgroundColor: colors.border }]} />
                </View>
                {evs.map((ev: any) => {
                  const d = new Date(ev.dateStart ?? ev.date);
                  const { day, month: mon } = getDayMonth(d);
                  const isRem = reminders.has(ev.id);
                  const tags: string[] = ev.tags ? (typeof ev.tags === "string" ? JSON.parse(ev.tags) : ev.tags) : [];
                  return (
                    <TouchableOpacity key={ev.id} style={[s.card, { backgroundColor: colors.surface }]} activeOpacity={0.75}>
                      <Image source={{ uri: ev.image ?? ev.imageUrl }} style={s.cardImg} contentFit="cover" />
                      <View style={s.cardBadges}>
                        <View style={[s.catBadge, { backgroundColor: colors.communal + "EE" }]}>
                          <Text style={s.catBadgeText}>{ev.category}</Text>
                        </View>
                        <View style={[s.freeBadge, { backgroundColor: (ev.isFree === true || ev.isFree === 1) ? colors.secondary + "EE" : colors.accent + "EE" }]}>
                          <Text style={s.freeBadgeText}>{(ev.isFree === true || ev.isFree === 1) ? "GRATUIT" : (ev.price ? `${ev.price}€` : ev.priceInfo ?? "Payant")}</Text>
                        </View>
                      </View>
                      <View style={s.cardBody}>
                        <View style={s.cardHeader}>
                          <View style={[s.datePill, { backgroundColor: colors.primary + "15" }]}>
                            <Text style={[s.dateDay, { color: colors.primary }]}>{day}</Text>
                            <Text style={[s.dateMon, { color: colors.primary }]}>{mon}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{ev.title}</Text>
                            <Text style={[s.cardOrg, { color: colors.muted }]}>Par {ev.organizer}</Text>
                          </View>
                        </View>
                        <Text style={[s.cardDesc, { color: colors.muted }]} numberOfLines={2}>{ev.description}</Text>
                        <View style={s.metaRow}>
                          <IconSymbol name="clock.fill" size={13} color={colors.muted} />
                          <Text style={[s.metaText, { color: colors.muted }]}>{ev.timeLabel ?? ev.time}</Text>
                          <IconSymbol name="location.fill" size={13} color={colors.muted} />
                          <Text style={[s.metaText, { color: colors.muted }]} numberOfLines={1}>{ev.location}</Text>
                        </View>
                        {tags.length > 0 && (
                          <View style={s.tags}>
                            {tags.map((t) => (
                              <View key={t} style={[s.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[s.tagText, { color: colors.muted }]}>#{t}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        <View style={[s.actions, { borderTopColor: colors.border }]}>
                          <TouchableOpacity style={s.actionBtn} onPress={() => toggleReminder(ev.id, ev.title)}>
                            <IconSymbol name={isRem ? "bell.fill" : "bell"} size={18} color={isRem ? colors.primary : colors.muted} />
                            <Text style={[s.actionText, { color: isRem ? colors.primary : colors.muted }]}>
                              {isRem ? "Rappel activé" : "Me rappeler"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.detailBtn, { backgroundColor: colors.communal }]}>
                            <Text style={s.detailBtnText}>Détails</Text>
                            <IconSymbol name="chevron.right" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ── Calendar view ─────────────────────────────────────────────── */}
        {!isLoading && viewMode === "calendar" && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
            {filtered.map((ev: any) => {
              const d = new Date(ev.dateStart ?? ev.date);
              const { day, month: mon } = getDayMonth(d);
              const isRem = reminders.has(ev.id);
              return (
                <TouchableOpacity key={ev.id} style={[s.calRow, { backgroundColor: colors.surface }]}>
                  <View style={[s.calDate, { backgroundColor: colors.communal + "15" }]}>
                    <Text style={[s.calDay, { color: colors.communal }]}>{day}</Text>
                    <Text style={[s.calMon, { color: colors.communal }]}>{mon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.calTitle, { color: colors.foreground }]} numberOfLines={1}>{ev.title}</Text>
                    <Text style={[s.calSub, { color: colors.muted }]}>{ev.timeLabel ?? ev.time} · {ev.location}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleReminder(ev.id, ev.title)}>
                    <IconSymbol name={isRem ? "bell.fill" : "bell"} size={20} color={isRem ? colors.primary : colors.border} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (c: any) => StyleSheet.create({
  sticky:      { paddingBottom: 10 },
  titleRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title:       { fontSize: 28, fontWeight: "800" },
  sub:         { fontSize: 13, marginTop: 2 },
  viewSwitch:  { flexDirection: "row", borderRadius: 10, overflow: "hidden", padding: 3, gap: 2 },
  viewBtn:     { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  searchBar:   { flexDirection: "row", alignItems: "center", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  cats:        { paddingHorizontal: 16, gap: 6, paddingBottom: 2 },
  catChip:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, gap: 5, marginRight: 6 },
  catText:     { fontSize: 13, fontWeight: "500" },
  empty:       { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle:  { fontSize: 18, fontWeight: "600" },
  emptySub:    { fontSize: 14 },
  monthHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginVertical: 14, gap: 10 },
  monthLine:   { flex: 1, height: 1 },
  monthLabel:  { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  card:        { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, overflow: "hidden" },
  cardImg:     { width: "100%", height: 160 },
  cardBadges:  { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", gap: 6 },
  catBadge:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  catBadgeText:{ color: "#fff", fontSize: 11, fontWeight: "600" },
  freeBadge:   { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  freeBadgeText:{ color: "#fff", fontSize: 11, fontWeight: "700" },
  cardBody:    { padding: 14 },
  cardHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  datePill:    { width: 48, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dateDay:     { fontSize: 20, fontWeight: "800", lineHeight: 22 },
  dateMon:     { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  cardTitle:   { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  cardOrg:     { fontSize: 12, marginTop: 3 },
  cardDesc:    { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  metaRow:     { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 8 },
  metaText:    { fontSize: 12, flex: 1 },
  tags:        { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagText:     { fontSize: 11 },
  actions:     { flexDirection: "row", alignItems: "center", borderTopWidth: 1, paddingTop: 12, gap: 8 },
  actionBtn:   { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  actionText:  { fontSize: 12, fontWeight: "500" },
  detailBtn:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
  detailBtnText:{ color: "#fff", fontSize: 13, fontWeight: "600" },
  calRow:      { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, gap: 12 },
  calDate:     { width: 50, height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  calDay:      { fontSize: 20, fontWeight: "800" },
  calMon:      { fontSize: 10, fontWeight: "700" },
  calTitle:    { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  calSub:      { fontSize: 11 },
});
