// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Modération : événements en attente (administrateurs de ville et administrateurs).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface PendingEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  dateStart: string;
  location: string;
  organizer: string;
  isFree: boolean | number;
  price: number | string;
}

export default function AdminEvents() {
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<PendingEvent[]>('events.pending', { postalCode: user?.postalCode || '7370' }, { authenticated: true });
    if (apiError || !data) setError(apiError || 'Liste indisponible.');
    else setEvents(data);
    setLoading(false);
  }, [user?.postalCode]);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Modération' }} /><AuthGate message="Réservé aux administrateurs." /></View>;
  }

  const decide = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id);
    const { error: apiError } = await trpcMutation(`events.${action}`, { id }, { authenticated: true });
    setBusyId(null);
    if (apiError) setError(apiError); else load();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Stack.Screen options={{ title: 'Événements à valider' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {error && <Text style={s.errorText}>{error}</Text>}
      {!loading && !error && events.length === 0 && <Text style={s.muted}>Aucun événement en attente.</Text>}
      {events.map(event => (
        <GlassCard key={event.id} style={s.card as any}>
          <Text style={s.eyebrow}>{event.category.toUpperCase()} · {event.organizer}</Text>
          <Text style={s.title}>{event.title}</Text>
          <Text style={s.muted}>{new Date(event.dateStart).toLocaleString('fr-BE')} — {event.location}</Text>
          <Text style={s.muted} numberOfLines={6}>{event.description}</Text>
          <Text style={s.muted}>{Number(event.isFree) ? 'Gratuit' : `Prix : ${Number(event.price).toFixed(2).replace('.', ',')} €`}</Text>
          <View style={s.actions}>
            <TouchableOpacity onPress={() => decide(event.id, 'approve')} disabled={busyId === event.id} style={[s.btn, s.approve]} accessibilityRole="button" accessibilityLabel={`Publier ${event.title}`}>
              <Text style={s.btnText}>Publier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => decide(event.id, 'reject')} disabled={busyId === event.id} style={[s.btn, s.reject]} accessibilityRole="button" accessibilityLabel={`Refuser ${event.title}`}>
              <Text style={[s.btnText, { color: theme.colors.danger }]}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 40, alignItems: 'center' },
    card: { padding: 14, gap: 8 },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, minHeight: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
    approve: { backgroundColor: theme.colors.electric },
    reject: { borderWidth: 1, borderColor: theme.colors.danger },
    btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  });
}
