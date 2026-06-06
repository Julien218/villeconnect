// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';

const API = 'https://villeconnect-production.up.railway.app';

const MOCK_EVENTS = [
  { id: '1', title: 'Marché de Dour', date: '2026-06-14', time: '08:00', location: 'Grand-Place', category: 'marché', emoji: '🛒' },
  { id: '2', title: 'Fête de la Musique', date: '2026-06-21', time: '14:00', location: 'Parc communal', category: 'culture', emoji: '🎵' },
  { id: '3', title: 'Tournoi de pétanque', date: '2026-06-28', time: '10:00', location: 'Place du Jeu de Balle', category: 'sport', emoji: '🏆' },
  { id: '4', title: 'Vide-grenier Dour', date: '2026-07-05', time: '09:00', location: 'Rue de Mons', category: 'brocante', emoji: '📦' },
  { id: '5', title: 'Concert Jazz', date: '2026-07-12', time: '20:00', location: 'Salle des fêtes', category: 'culture', emoji: '🎷' },
];

const CAT_COLORS: Record<string, string> = {
  marché: '#10B981', culture: '#3B82F6', sport: '#F59E0B',
  brocante: '#7C3AED', default: '#6B7280',
};

export default function EventsScreen() {
  const [events, setEvents]     = useState(MOCK_EVENTS);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`${API}/trpc/events.getAll?input=${encodeURIComponent(JSON.stringify({ postal_code: '7370' }))}`);
      if (res.ok) {
        const d = await res.json();
        if (d?.result?.data?.length) setEvents(d.result.data);
      }
    } catch { /* utiliser les données mock */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#10B981" />}
    >
      <View style={s.header}>
        <Text style={s.headerSub}>Dour · {events.length} événements à venir</Text>
      </View>

      {loading && <ActivityIndicator color="#10B981" style={{ marginTop: 40 }} />}

      {events.map(ev => {
        const catColor = CAT_COLORS[ev.category] ?? CAT_COLORS.default;
        return (
          <TouchableOpacity key={ev.id} style={s.card} activeOpacity={0.75}>
            <View style={[s.dateBox, { backgroundColor: catColor + '22', borderColor: catColor + '44' }]}>
              <Text style={[s.dateDay, { color: catColor }]}>
                {new Date(ev.date).getDate()}
              </Text>
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
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#0A0F1E' },
  header:      { padding: 16, paddingBottom: 8 },
  headerSub:   { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  card:        { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  dateBox:     { width: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', paddingVertical: 8 },
  dateDay:     { fontSize: 22, fontWeight: '900' },
  dateMon:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  eventEmoji:  { color: '#F9FAFB', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  eventTitle:  { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  eventMeta:   { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  catBadge:    { alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  catText:     { fontSize: 11, fontWeight: '700' },
});
