// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { trpcQuery } from '@/shared/api-client';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

// Fallback utilisé UNIQUEMENT si l'API est injoignable (jamais affiché si des données réelles existent).
const MOCK_EVENTS = [
  { id: '1', title: 'Marché de Dour', date: '2026-06-14', time: '08:00', location: 'Grand-Place', category: 'marché', emoji: '🛒' },
  { id: '2', title: 'Fête de la Musique', date: '2026-06-21', time: '14:00', location: 'Parc communal', category: 'culture', emoji: '🎵' },
];

const CAT_EMOJI: Record<string, string> = {
  Culture: '🎵', Sport: '🏆', Marché: '🛒', Jeunesse: '🎪',
  Environnement: '🌱', Communal: '📢', Autre: '📅',
};

function normalizeApiEvent(ev: any) {
  return {
    id: String(ev.id),
    title: ev.title,
    date: ev.dateStart,
    time: ev.timeLabel || new Date(ev.dateStart).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
    location: ev.location || ev.address || ev.city || '',
    category: ev.category || 'Autre',
    emoji: CAT_EMOJI[ev.category] || '📅',
  };
}

export default function EventsScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const CAT_COLORS: Record<string, string> = {
    Marché: theme.colors.success, Culture: theme.colors.electric, Sport: theme.colors.warning,
    Jeunesse: '#A855F7', Environnement: '#22C55E', Communal: theme.colors.danger, default: theme.colors.cyan,
  };
  const [events, setEvents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMock, setIsMock]     = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data, error } = await trpcQuery<any[]>('events.list', { postalCode: '7370', limit: 20 });
    if (data && data.length > 0) {
      setEvents(data.map(normalizeApiEvent));
      setIsMock(false);
    } else {
      setEvents(MOCK_EVENTS);
      setIsMock(true);
      if (error) console.warn('[events] API indisponible, fallback mock:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      <View style={s.header}>
        <Text style={s.headerSub}>Dour · {events.length} événements à venir</Text>
        {isMock && <Text style={s.mockBadge}>⚠️ Données hors-ligne (démo)</Text>}
      </View>

      {loading && <ActivityIndicator color={theme.colors.cyan} style={{ marginTop: 40 }} />}

      {!loading && events.map(ev => {
        const catColor = CAT_COLORS[ev.category] ?? CAT_COLORS.default;
        return (
          <TouchableOpacity key={ev.id} activeOpacity={0.8}>
            <GlassCard style={s.card as any}>
              <View style={[s.dateBox, { backgroundColor: catColor + '22', borderColor: catColor + '44' }]}>
                <Text style={[s.dateDay, { color: catColor }]}>{new Date(ev.date).getDate()}</Text>
                <Text style={[s.dateMon, { color: catColor }]}>
                  {new Date(ev.date).toLocaleDateString('fr-BE', { month: 'short' }).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.eventEmoji}>{ev.emoji} <Text style={s.eventTitle}>{ev.title}</Text></Text>
                <Text style={s.eventMeta}>🕐 {ev.time}  ·  📍 {ev.location}</Text>
                <View style={[s.catBadge, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
                  <Text style={[s.catText, { color: catColor }]}>{ev.category}</Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen:      { flex: 1, backgroundColor: theme.colors.bgDeep },
    header:      { padding: 16, paddingBottom: 8 },
    headerSub:   { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
    mockBadge:   { color: theme.colors.warning, fontSize: 11, fontWeight: '700', marginTop: 4 },
    card:        { marginHorizontal: 16, marginBottom: 12, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    dateBox:     { width: 52, borderRadius: theme.radius.sm, borderWidth: 1, alignItems: 'center', paddingVertical: 8 },
    dateDay:     { fontSize: 22, fontWeight: '900' },
    dateMon:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    eventEmoji:  { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    eventTitle:  { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
    eventMeta:   { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 },
    catBadge:    { alignSelf: 'flex-start', borderRadius: theme.radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    catText:     { fontSize: 11, fontWeight: '700' },
  });
}
