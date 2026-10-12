// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Modération des annonces : file d'attente (nouveaux auteurs, annonces signalées, cas douteux).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { listingKindLabel } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface Pending {
  id: number; kind: string; title: string; description: string; author: string; reports: number; aiNote?: string | null;
}

export default function AdminCommunity() {
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await trpcQuery<Pending[]>('community.adminQueue', { postalCode: user?.postalCode || '7370' }, { authenticated: true });
    if (apiError || !data) setError(apiError || 'File indisponible.'); else { setItems(data); setError(null); }
    setLoading(false);
  }, [user?.postalCode]);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Annonces' }} /><AuthGate message="Réservé aux administrateurs." /></View>;
  }

  const decide = async (id: number, action: 'approve' | 'reject' | 'remove') => {
    setBusyId(id);
    const { error: apiError } = await trpcMutation('community.adminDecide', { id, action }, { authenticated: true });
    setBusyId(null);
    if (apiError) setError(apiError); else load();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Stack.Screen options={{ title: 'Annonces à vérifier' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {error && <Text style={s.errorText}>{error}</Text>}
      {!loading && !error && items.length === 0 && <Text style={s.muted}>Aucune annonce à vérifier.</Text>}
      {items.map(item => (
        <GlassCard key={item.id} style={s.card as any}>
          <Text style={s.kind}>{listingKindLabel(item.kind).toUpperCase()} · {item.author}{item.reports > 0 ? ` · ${item.reports} signalement(s)` : ''}</Text>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.muted} numberOfLines={8}>{item.description}</Text>
          {item.aiNote ? <Text style={s.ai}>Avis de l’IA : {item.aiNote}</Text> : null}
          <View style={s.actions}>
            <TouchableOpacity onPress={() => decide(item.id, 'approve')} disabled={busyId === item.id} style={[s.btn, s.approve]} accessibilityRole="button"><Text style={s.btnText}>Publier</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => decide(item.id, 'reject')} disabled={busyId === item.id} style={[s.btn, s.reject]} accessibilityRole="button"><Text style={[s.btnText, { color: theme.colors.danger }]}>Refuser</Text></TouchableOpacity>
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
    kind: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
    title: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    ai: { color: theme.colors.warning, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, minHeight: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
    approve: { backgroundColor: theme.colors.electric },
    reject: { borderWidth: 1, borderColor: theme.colors.danger },
    btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  });
}
