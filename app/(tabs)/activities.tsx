/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState, useMemo } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { Image } from "expo-image";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventCategory =
  | "Tous"
  | "Culture"
  | "Sport"
  | "Marché"
  | "Jeunesse"
  | "Environnement"
  | "Communal";

type EventType = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  date: string;           // "2026-06-07"
  time: string;           // "14h00 – 18h00"
  location: string;
  address: string;
  image: string;
  isFree: boolean;
  price?: string;
  organizer: string;
  isReminded: boolean;
  tags: string[];
};

// ─── Données mock ─────────────────────────────────────────────────────────────

const EVENTS: EventType[] = [
  {
    id: "e1",
    title: "Marché hebdomadaire du samedi",
    description:
      "Retrouvez chaque samedi matin les producteurs locaux, maraîchers, fromagers et artisans de la région. Fruits, légumes de saison, produits du terroir belge.",
    category: "Marché",
    date: "2026-05-30",
    time: "8h00 – 13h00",
    location: "Place du Marché",
    address: "Place du Marché, 1000 Ville",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600",
    isFree: true,
    organizer: "Commune de Ville",
    isReminded: false,
    tags: ["Local", "Alimentation", "Hebdomadaire"],
  },
  {
    id: "e2",
    title: "Concert en plein air — Jazz & Blues",
    description:
      "Soirée musicale exceptionnelle dans le parc communal. Trois groupes locaux se succèdent sur scène. Amenez vos pique-niques, l'entrée est libre.",
    category: "Culture",
    date: "2026-06-07",
    time: "19h00 – 23h00",
    location: "Parc Communal",
    address: "Rue du Parc 12, 1000 Ville",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
    isFree: true,
    organizer: "Maison de la Culture",
    isReminded: false,
    tags: ["Musique", "Famille", "Soirée"],
  },
  {
    id: "e3",
    title: "Tournoi de football intercommunal",
    description:
      "Le club local ouvre son tournoi annuel aux équipes des communes voisines. Matches toute la journée, buvette et animations pour les enfants.",
    category: "Sport",
    date: "2026-06-14",
    time: "9h00 – 18h00",
    location: "Stade Municipal",
    address: "Rue du Stade 5, 1000 Ville",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600",
    isFree: true,
    organizer: "FC VilleConnect",
    isReminded: false,
    tags: ["Sport", "Jeunesse", "Compétition"],
  },
  {
    id: "e4",
    title: "Atelier jardinage urbain",
    description:
      "Apprenez les bases du compostage, de la permaculture et du potager balcon. Matériel fourni. Places limitées à 20 personnes — inscription obligatoire.",
    category: "Environnement",
    date: "2026-06-21",
    time: "10h00 – 12h30",
    location: "Maison de la Nature",
    address: "Avenue Verte 3, 1000 Ville",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600",
    isFree: false,
    price: "5€ / personne",
    organizer: "Éco-quartier Ville",
    isReminded: false,
    tags: ["Écologie", "Atelier", "Inscription"],
  },
  {
    id: "e5",
    title: "Fête de quartier — Rue des Acacias",
    description:
      "La rue des Acacias ferme à la circulation pour une après-midi de fête entre voisins. Jeux pour enfants, musique, barbecue collectif.",
    category: "Communal",
    date: "2026-07-05",
    time: "15h00 – 21h00",
    location: "Rue des Acacias",
    address: "Rue des Acacias, 1000 Ville",
    image: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600",
    isFree: true,
    organizer: "Comité de quartier",
    isReminded: false,
    tags: ["Voisinage", "Famille", "Convivialité"],
  },
  {
    id: "e6",
    title: "Exposition photo — 'Notre Ville'",
    description:
      "Les habitants ont photographié leur quotidien pendant 3 mois. 120 clichés exposés à la galerie communale. Vernissage le vendredi 11 juillet à 18h.",
    category: "Culture",
    date: "2026-07-11",
    time: "18h00 – 20h00",
    location: "Galerie Communale",
    address: "Rue de l'Art 7, 1000 Ville",
    image: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=600",
    isFree: true,
    organizer: "Service Culturel",
    isReminded: false,
    tags: ["Art", "Photo", "Vernissage"],
  },
  {
    id: "e7",
    title: "Stage vacances — Multi-sports jeunes",
    description:
      "Stage d'été pour les 8–14 ans : tennis, natation, basket, escalade. Encadrement par des moniteurs diplômés. Inscription via le service jeunesse.",
    category: "Jeunesse",
    date: "2026-07-07",
    time: "9h00 – 16h00",
    location: "Centre Sportif",
    address: "Boulevard du Sport 20, 1000 Ville",
    image: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=600",
    isFree: false,
    price: "45€ / semaine",
    organizer: "Service Jeunesse",
    isReminded: false,
    tags: ["Enfants", "Vacances", "Sport"],
  },
  {
    id: "e8",
    title: "Journée portes ouvertes — Recyclerie",
    description:
      "Découvrez la recyclerie communale : dépôt de vêtements, meubles, électronique. Ateliers réparation gratuits. Une seconde vie pour vos objets.",
    category: "Environnement",
    date: "2026-07-18",
    time: "10h00 – 17h00",
    location: "Recyclerie de Ville",
    address: "Zone Artisanale, Rue du Tri 2",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
    isFree: true,
    organizer: "Commune de Ville",
    isReminded: false,
    tags: ["Écologie", "Solidarité", "DIY"],
  },
];

const CATEGORIES: EventCategory[] = [
  "Tous",
  "Culture",
  "Sport",
  "Marché",
  "Jeunesse",
  "Environnement",
  "Communal",
];

const CATEGORY_ICONS: Record<EventCategory, any> = {
  Tous: "star.fill",
  Culture: "paintpalette.fill",
  Sport: "sportscourt.fill",
  Marché: "basket.fill",
  Jeunesse: "figure.play",
  Environnement: "leaf.fill",
  Communal: "building.columns.fill",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDayMonth(dateStr: string): { day: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString("fr-BE", { month: "short" }).toUpperCase(),
  };
}

function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr) >= new Date();
}

function groupByMonth(events: EventType[]): Record<string, EventType[]> {
  return events.reduce(
    (acc, event) => {
      const key = new Date(event.date).toLocaleDateString("fr-BE", {
        month: "long",
        year: "numeric",
      });
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    },
    {} as Record<string, EventType[]>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function ActivitiesScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const filtered = useMemo(() => {
    return EVENTS.filter((e) => {
      const matchCat = selectedCategory === "Tous" || e.category === selectedCategory;
      const matchSearch =
        searchQuery === "" ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const toggleReminder = (eventId: string, eventTitle: string) => {
    setReminders((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        Alert.alert("Rappel supprimé", `Rappel annulé pour « ${eventTitle} »`);
      } else {
        next.add(eventId);
        Alert.alert(
          "Rappel activé ✓",
          `Vous serez notifié avant « ${eventTitle} »`,
          [{ text: "OK" }]
        );
      }
      return next;
    });
  };

  const handleShare = (event: EventType) => {
    Alert.alert(
      "Partager",
      `${event.title}\n${formatDate(event.date)}\n${event.location}`,
      [{ text: "Fermer" }]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
      >
        {/* ── Sticky Header ───────────────────────────────────────────────── */}
        <View style={[styles.stickyHeader, { backgroundColor: colors.background }]}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Activités</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {filtered.length} événement{filtered.length > 1 ? "s" : ""} à venir
              </Text>
            </View>
            {/* Vue switcher */}
            <View style={[styles.viewSwitcher, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[
                  styles.viewBtn,
                  viewMode === "list" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setViewMode("list")}
              >
                <IconSymbol
                  name="list.bullet"
                  size={18}
                  color={viewMode === "list" ? "#FFF" : colors.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewBtn,
                  viewMode === "calendar" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setViewMode("calendar")}
              >
                <IconSymbol
                  name="calendar"
                  size={18}
                  color={viewMode === "calendar" ? "#FFF" : colors.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Rechercher un événement, lieu..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      selectedCategory === cat ? colors.communal : colors.surface,
                    borderColor:
                      selectedCategory === cat ? colors.communal : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <IconSymbol
                  name={CATEGORY_ICONS[cat]}
                  size={13}
                  color={selectedCategory === cat ? "#FFF" : colors.muted}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === cat ? "#FFF" : colors.foreground },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Vue Agenda (list groupée par mois) ──────────────────────────── */}
        {viewMode === "list" && (
          <View style={styles.listContainer}>
            {Object.keys(grouped).length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="calendar.badge.exclamationmark" size={52} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Aucun événement trouvé
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Essayez une autre catégorie ou modifiez votre recherche.
                </Text>
              </View>
            ) : (
              Object.entries(grouped).map(([month, events]) => (
                <View key={month}>
                  {/* Month header */}
                  <View style={styles.monthHeader}>
                    <View style={[styles.monthLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.monthLabel, { color: colors.muted }]}>
                      {month.toUpperCase()}
                    </Text>
                    <View style={[styles.monthLine, { backgroundColor: colors.border }]} />
                  </View>

                  {/* Events */}
                  {events.map((event) => {
                    const { day, month: mon } = getDayMonth(event.date);
                    const isReminded = reminders.has(event.id);
                    const upcoming = isUpcoming(event.date);

                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.eventCard,
                          { backgroundColor: colors.surface },
                          !upcoming && { opacity: 0.55 },
                        ]}
                        activeOpacity={0.75}
                      >
                        {/* Image */}
                        <Image
                          source={{ uri: event.image }}
                          style={styles.eventImage}
                          contentFit="cover"
                        />

                        {/* Badges */}
                        <View style={styles.badgesRow}>
                          <View
                            style={[
                              styles.categoryBadge,
                              { backgroundColor: colors.communal + "EE" },
                            ]}
                          >
                            <IconSymbol
                              name={CATEGORY_ICONS[event.category]}
                              size={11}
                              color="#FFF"
                            />
                            <Text style={styles.categoryBadgeText}>{event.category}</Text>
                          </View>
                          {event.isFree ? (
                            <View
                              style={[
                                styles.freeBadge,
                                { backgroundColor: colors.secondary + "EE" },
                              ]}
                            >
                              <Text style={styles.freeBadgeText}>GRATUIT</Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.freeBadge,
                                { backgroundColor: colors.accent + "EE" },
                              ]}
                            >
                              <Text style={styles.freeBadgeText}>{event.price}</Text>
                            </View>
                          )}
                        </View>

                        {/* Content */}
                        <View style={styles.eventContent}>
                          {/* Date block + title */}
                          <View style={styles.eventHeader}>
                            <View
                              style={[
                                styles.datePill,
                                { backgroundColor: colors.primary + "15" },
                              ]}
                            >
                              <Text style={[styles.dateDay, { color: colors.primary }]}>{day}</Text>
                              <Text style={[styles.dateMonth, { color: colors.primary }]}>
                                {mon}
                              </Text>
                            </View>
                            <View style={styles.eventTitleBlock}>
                              <Text
                                style={[styles.eventTitle, { color: colors.foreground }]}
                                numberOfLines={2}
                              >
                                {event.title}
                              </Text>
                              <Text style={[styles.organizer, { color: colors.muted }]}>
                                Par {event.organizer}
                              </Text>
                            </View>
                          </View>

                          {/* Description */}
                          <Text
                            style={[styles.eventDescription, { color: colors.muted }]}
                            numberOfLines={2}
                          >
                            {event.description}
                          </Text>

                          {/* Meta info */}
                          <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                              <IconSymbol name="clock.fill" size={13} color={colors.muted} />
                              <Text style={[styles.metaText, { color: colors.muted }]}>
                                {event.time}
                              </Text>
                            </View>
                            <View style={styles.metaItem}>
                              <IconSymbol name="location.fill" size={13} color={colors.muted} />
                              <Text
                                style={[styles.metaText, { color: colors.muted }]}
                                numberOfLines={1}
                              >
                                {event.location}
                              </Text>
                            </View>
                          </View>

                          {/* Tags */}
                          <View style={styles.tagsRow}>
                            {event.tags.map((tag) => (
                              <View
                                key={tag}
                                style={[
                                  styles.tag,
                                  { backgroundColor: colors.background, borderColor: colors.border },
                                ]}
                              >
                                <Text style={[styles.tagText, { color: colors.muted }]}>
                                  #{tag}
                                </Text>
                              </View>
                            ))}
                          </View>

                          {/* Actions */}
                          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => toggleReminder(event.id, event.title)}
                            >
                              <IconSymbol
                                name={isReminded ? "bell.fill" : "bell"}
                                size={18}
                                color={isReminded ? colors.primary : colors.muted}
                              />
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: isReminded ? colors.primary : colors.muted },
                                ]}
                              >
                                {isReminded ? "Rappel activé" : "Me rappeler"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => handleShare(event)}
                            >
                              <IconSymbol name="square.and.arrow.up" size={18} color={colors.muted} />
                              <Text style={[styles.actionBtnText, { color: colors.muted }]}>
                                Partager
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.detailBtn,
                                { backgroundColor: colors.communal },
                              ]}
                            >
                              <Text style={styles.detailBtnText}>Détails</Text>
                              <IconSymbol name="chevron.right" size={14} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Vue Calendrier compact ───────────────────────────────────────── */}
        {viewMode === "calendar" && (
          <View style={styles.calendarContainer}>
            <View style={[styles.calendarBanner, { backgroundColor: colors.surface }]}>
              <IconSymbol name="calendar" size={28} color={colors.communal} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.calendarBannerTitle, { color: colors.foreground }]}>
                  Agenda des prochains mois
                </Text>
                <Text style={[styles.calendarBannerSub, { color: colors.muted }]}>
                  {filtered.length} événement{filtered.length > 1 ? "s" : ""} programmé
                  {filtered.length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            {filtered.map((event) => {
              const { day, month: mon } = getDayMonth(event.date);
              const isReminded = reminders.has(event.id);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.calendarRow, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.calendarDate, { backgroundColor: colors.communal + "15" }]}>
                    <Text style={[styles.calendarDay, { color: colors.communal }]}>{day}</Text>
                    <Text style={[styles.calendarMonth, { color: colors.communal }]}>{mon}</Text>
                  </View>
                  <View style={styles.calendarInfo}>
                    <Text
                      style={[styles.calendarTitle, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                    <View style={styles.calendarMeta}>
                      <IconSymbol name="clock.fill" size={11} color={colors.muted} />
                      <Text style={[styles.calendarMetaText, { color: colors.muted }]}>
                        {event.time}
                      </Text>
                      <Text style={[styles.calendarMetaDot, { color: colors.muted }]}>·</Text>
                      <IconSymbol name="location.fill" size={11} color={colors.muted} />
                      <Text
                        style={[styles.calendarMetaText, { color: colors.muted }]}
                        numberOfLines={1}
                      >
                        {event.location}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.calendarCatBadge,
                        { backgroundColor: colors.communal + "15" },
                      ]}
                    >
                      <Text style={[styles.calendarCatText, { color: colors.communal }]}>
                        {event.category}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleReminder(event.id, event.title)}
                    style={styles.calendarBellBtn}
                  >
                    <IconSymbol
                      name={isReminded ? "bell.fill" : "bell"}
                      size={20}
                      color={isReminded ? colors.primary : colors.border}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* Newsletter banner */}
            <View style={[styles.newsletterCard, { backgroundColor: colors.communal + "15", borderColor: colors.communal + "30" }]}>
              <IconSymbol name="envelope.fill" size={24} color={colors.communal} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.newsletterTitle, { color: colors.foreground }]}>
                  Restez informé
                </Text>
                <Text style={[styles.newsletterSub, { color: colors.muted }]}>
                  Abonnez-vous à la newsletter communale pour recevoir les événements chaque semaine.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.newsletterBtn, { backgroundColor: colors.communal }]}
                onPress={() =>
                  Alert.alert(
                    "Newsletter",
                    "Fonctionnalité disponible après connexion à votre compte VilleConnect.",
                    [{ text: "OK" }]
                  )
                }
              >
                <Text style={styles.newsletterBtnText}>S'abonner</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Proposer un événement ────────────────────────────────────────── */}
        <View style={styles.proposeSection}>
          <TouchableOpacity
            style={[styles.proposeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                "Proposer un événement",
                "Vous organisez un événement dans la commune ? Contactez le service culturel pour le faire apparaître sur VilleConnect.",
                [{ text: "Fermer" }]
              )
            }
          >
            <View style={[styles.proposeIcon, { backgroundColor: colors.accent + "20" }]}>
              <IconSymbol name="plus.circle.fill" size={28} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.proposeTitle, { color: colors.foreground }]}>
                Proposer un événement
              </Text>
              <Text style={[styles.proposeSub, { color: colors.muted }]}>
                Vous organisez quelque chose ? Signalez-le à la commune.
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },

  // Sticky header
  stickyHeader: { paddingBottom: 12 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  viewSwitcher: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    padding: 3,
    gap: 2,
  },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  categoriesRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 2 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    marginRight: 6,
  },
  categoryText: { fontSize: 13, fontWeight: "500" },

  // List view
  listContainer: { paddingTop: 8 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginVertical: 16,
    gap: 10,
  },
  monthLine: { flex: 1, height: 1 },
  monthLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },

  // Event card
  eventCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, overflow: "hidden" },
  eventImage: { width: "100%", height: 160 },
  badgesRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  categoryBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "600" },
  freeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  freeBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  eventContent: { padding: 14 },
  eventHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  datePill: {
    width: 48,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 20, fontWeight: "800", lineHeight: 22 },
  dateMonth: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  eventTitleBlock: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  organizer: { fontSize: 12, marginTop: 3 },
  eventDescription: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: "row", gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaText: { fontSize: 12, flex: 1 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 11 },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  actionBtnText: { fontSize: 12, fontWeight: "500" },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  detailBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Calendar view
  calendarContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  calendarBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
  },
  calendarBannerTitle: { fontSize: 16, fontWeight: "600" },
  calendarBannerSub: { fontSize: 13, marginTop: 2 },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  calendarDate: {
    width: 50,
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDay: { fontSize: 20, fontWeight: "800" },
  calendarMonth: { fontSize: 10, fontWeight: "700" },
  calendarInfo: { flex: 1 },
  calendarTitle: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  calendarMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 5 },
  calendarMetaText: { fontSize: 11, flex: 1 },
  calendarMetaDot: { fontSize: 11, marginHorizontal: 2 },
  calendarCatBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  calendarCatText: { fontSize: 10, fontWeight: "600" },
  calendarBellBtn: { padding: 6 },

  // Newsletter
  newsletterCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  newsletterTitle: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  newsletterSub: { fontSize: 12, lineHeight: 17 },
  newsletterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newsletterBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  // Propose
  proposeSection: { paddingHorizontal: 16, paddingTop: 8 },
  proposeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  proposeIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  proposeTitle: { fontSize: 15, fontWeight: "600" },
  proposeSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
