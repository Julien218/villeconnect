// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Modération Sport : fiches de clubs et d'installations proposées, publication en un clic.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';
import { SportPlace, SportPlaceForm } from '../sport';

export default function AdminSport() {
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode || '7370';
  const [places, setPlaces] = useState<SportPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<SportPlace[]>('sport.adminPending', { postalCode }, { authenticated: true });
    if (apiError || !data) setError(apiError || 'Liste indisponible.');
    else setPlaces(data);
    setLoading(false);
  }, [postalCode]);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Sport' }} /><AuthGate message="Réservé aux administrateurs." /></View>;
  }

  const decide = async (id: number, status: 'published' | 'rejected') => {
    setBusyId(id);
    const { error: apiError } = await trpcMutation('sport.adminSetStatus', { id, status }, { authenticated: true });
    setBusyId(null);
    if (apiError) setError(apiError); else load();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Fiches Sport à valider' }} />
      <GlassCard style={s.card as any}>
        <Text style={s.title}>Ajouter directement une fiche</Text>
        <Text style={s.muted}>Une fiche saisie ici est publiée immédiatement.</Text>
        {showForm
          ? <SportPlaceForm postalCode={postalCode} theme={theme} admin onDone={() => setShowForm(false)} />
          : (
            <TouchableOpacity onPress={() => setShowForm(true)} style={[s.btn, s.approve]} accessibilityRole="button">
              <Text style={s.btnText}>Nouvelle fiche</Text>
            </TouchableOpacity>
          )}
      </GlassCard>

      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {error && <Text style={s.errorText}>{error}</Text>}
      {!loading && !error && places.length === 0 && <Text style={s.muted}>Aucune fiche en attente.</Text>}
      {places.map(place => (
        <GlassCard key={place.id} style={s.card as any}>
          <Text style={s.eyebrow}>{place.kind === 'club' ? 'CLUB' : 'INSTALLATION'} · {place.sports.join(', ').toUpperCase()}</Text>
          <Text style={s.title}>{place.name}</Text>
          {[place.description, place.audience, place.schedule, place.priceInfo, place.address,
            [place.phone, place.email, place.website].filter(Boolean).join(' · ')]
            .filter(Boolean)
            .map((line, index) => <Text key={index} style={s.muted}>{line}</Text>)}
          <View style={s.actions}>
            <TouchableOpacity onPress={() => decide(place.id, 'published')} disabled={busyId === place.id} style={[s.btn, s.approve]} accessibilityRole="button" accessibilityLabel={`Publier ${place.name}`}>
              <Text style={s.btnText}>Publier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => decide(place.id, 'rejected')} disabled={busyId === place.id} style={[s.btn, s.reject]} accessibilityRole="button" accessibilityLabel={`Refuser ${place.name}`}>
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
