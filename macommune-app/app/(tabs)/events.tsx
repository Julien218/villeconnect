// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

interface PublishedEvent {
  id: number | string;
  title: string;
  description?: string | null;
  category?: string | null;
  dateStart: string;
  dateEnd?: string | null;
  timeLabel?: string | null;
  location?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  isFree?: boolean | number | null;
  price?: number | string | null;
  organizer?: string | null;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Culture: 'musical-notes-outline',
  Sport: 'trophy-outline',
  Marché: 'basket-outline',
  Jeunesse: 'happy-outline',
  Environnement: 'leaf-outline',
  Communal: 'megaphone-outline',
  Autre: 'calendar-outline',
};

function formatTime(event: PublishedEvent) {
  if (event.timeLabel?.trim()) return event.timeLabel;
  const date = new Date(event.dateStart);
  return Number.isNaN(date.getTime())
    ? 'Horaire à confirmer'
    : date.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
}

function formatLocation(event: PublishedEvent) {
  return [event.location, event.address, event.city]
    .map(value => value?.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(' · ');
}

export default function EventsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode?.trim() || '7370';
  const cityLabel = user?.city?.trim() || 'votre ville';

  const [events, setEvents] = useState<PublishedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Le module « Sport » du hub ouvre l'agenda déjà filtré (?category=Sport).
  const params = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || 'Tous');

  useEffect(() => {
    setSelectedCategory(params.category || 'Tous');
  }, [params.category]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { data, error: apiError } = await trpcQuery<PublishedEvent[]>(
      'events.list',
      { postalCode, limit: 50 }
    );

    if (apiError || !data) {
      setEvents([]);
      setError(apiError || 'Le calendrier local est momentanément indisponible.');
    } else {
      setEvents(data);
    }

    setLoading(false);
    setRefreshing(false);
  }, [postalCode]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    // La catégorie sélectionnée reste visible même si aucun événement ne l'utilise encore.
    const known = events.map(event => event.category || 'Autre');
    const values = Array.from(new Set(
      selectedCategory !== 'Tous' ? [...known, selectedCategory] : known
    )).sort();
    return ['Tous', ...values];
  }, [events, selectedCategory]);

  const filteredEvents = useMemo(() => (
    selectedCategory === 'Tous'
      ? events
      : events.filter(event => (event.category || 'Autre') === selectedCategory)
  ), [events, selectedCategory]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={theme.colors.cyan}
        />
      }
    >
      <LinearGradient
        colors={[theme.colors.surfaceSolid, theme.colors.bgDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerIcon}>
          <Ionicons name="calendar-outline" size={29} color={theme.colors.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>AGENDA LOCAL</Text>
          <Text style={s.title}>Événements de {cityLabel}</Text>
          <Text style={s.subtitle}>Uniquement les événements approuvés · zone {postalCode}</Text>
        </View>
      </LinearGradient>

      {!loading && !error && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryList}
        >
          {categories.map(category => {
            const selected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[s.categoryChip, selected && s.categoryChipActive]}
                onPress={() => setSelectedCategory(category)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[s.categoryChipText, selected && s.categoryChipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading && (
        <View style={s.stateBox}>
          <ActivityIndicator color={theme.colors.cyan} size="large" />
          <Text style={s.stateText}>Chargement des événements publiés…</Text>
        </View>
      )}

      {!loading && error && (
        <GlassCard style={s.stateCard as any}>
          <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.warning} />
          <Text style={s.stateTitle}>Agenda indisponible</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity
            style={s.retryButton}
            onPress={() => load()}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={theme.colors.bgDeep} />
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <GlassCard style={s.stateCard as any}>
          <Ionicons name="calendar-clear-outline" size={36} color={theme.colors.cyan} />
          <Text style={s.stateTitle}>
            {selectedCategory === 'Tous' ? 'Aucun événement publié' : 'Aucun événement dans cette catégorie'}
          </Text>
          <Text style={s.stateText}>
            Les événements apparaissent ici uniquement après validation par la plateforme.
          </Text>
        </GlassCard>
      )}

      {!loading && !error && filteredEvents.map(event => {
        const date = new Date(event.dateStart);
        const validDate = !Number.isNaN(date.getTime());
        const category = event.category || 'Autre';
        const location = formatLocation(event);
        const isFree = Boolean(event.isFree);
        const price = Number(event.price || 0);

        return (
          <GlassCard key={String(event.id)} style={s.card as any}>
            <View style={s.dateBox}>
              <Text style={s.dateDay}>{validDate ? date.getDate() : '—'}</Text>
              <Text style={s.dateMonth}>
                {validDate
                  ? date.toLocaleDateString('fr-BE', { month: 'short' }).toUpperCase()
                  : 'DATE'}
              </Text>
            </View>

            <View style={s.eventBody}>
              <View style={s.titleRow}>
                <View style={s.categoryIcon}>
                  <Ionicons
                    name={CATEGORY_ICONS[category] || CATEGORY_ICONS.Autre}
                    size={17}
                    color={theme.colors.cyan}
                  />
                </View>
                <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
              </View>

              <View style={s.metaRow}>
                <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                <Text style={s.metaText}>{formatTime(event)}</Text>
              </View>

              {location ? (
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={s.metaText} numberOfLines={2}>{location}</Text>
                </View>
              ) : null}

              <View style={s.footerRow}>
                <View style={s.categoryBadge}>
                  <Text style={s.categoryBadgeText}>{category}</Text>
                </View>
                <Text style={s.priceText}>
                  {isFree || price === 0 ? 'Gratuit' : `${price.toFixed(2)} €`}
                </Text>
              </View>
            </View>
          </GlassCard>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { paddingTop: 10, paddingBottom: 120 },
    header: {
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 20,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '55',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
    },
    headerIcon: {
      width: 59,
      height: 59,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '66',
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    title: { color: theme.colors.textPrimary, fontSize: 21, fontWeight: '900', marginTop: 3 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 5, lineHeight: 16 },
    categoryList: { paddingHorizontal: 16, gap: 8, paddingBottom: 14 },
    categoryChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSolid,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    categoryChipActive: { borderColor: theme.colors.cyan, backgroundColor: theme.colors.cyanSoft },
    categoryChipText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
    categoryChipTextActive: { color: theme.colors.cyan },
    stateBox: { alignItems: 'center', gap: 12, paddingVertical: 44 },
    stateCard: { marginHorizontal: 16, padding: 28, alignItems: 'center', gap: 10 },
    stateTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'center' },
    stateText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 19, textAlign: 'center' },
    retryButton: {
      marginTop: 7,
      flexDirection: 'row',
      gap: 7,
      alignItems: 'center',
      backgroundColor: theme.colors.cyan,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    retryText: { color: theme.colors.bgDeep, fontWeight: '900', fontSize: 12 },
    card: {
      marginHorizontal: 16,
      marginBottom: 11,
      padding: 16,
      flexDirection: 'row',
      gap: 13,
      alignItems: 'flex-start',
    },
    dateBox: {
      width: 55,
      minHeight: 63,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '55',
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateDay: { color: theme.colors.cyan, fontSize: 23, fontWeight: '900' },
    dateMonth: { color: theme.colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
    eventBody: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    categoryIcon: {
      width: 29,
      height: 29,
      borderRadius: 10,
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventTitle: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '900', flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 7 },
    metaText: { color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16, flex: 1 },
    footerRow: {
      marginTop: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    categoryBadge: {
      borderRadius: 7,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '44',
      backgroundColor: theme.colors.cyanSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryBadgeText: { color: theme.colors.cyan, fontSize: 9, fontWeight: '800' },
    priceText: { color: theme.colors.success, fontSize: 11, fontWeight: '900' },
  });
}
