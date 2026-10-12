// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Messages : conversations entre voisins, toujours liées à une annonce.
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface Conversation {
  id: number; title: string; other: string; lastBody?: string | null; lastMessageAt: string; unread: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data, error: apiError } = await trpcQuery<Conversation[]>('community.conversations', {}, { authenticated: true });
    if (apiError || !data) setError(apiError || 'Messages indisponibles.'); else { setItems(data); setError(null); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Recharge à chaque retour sur l'onglet (nouveaux messages, messages lus).
  useFocusEffect(useCallback(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]));

  if (!isLoggedIn) {
    return <AuthGate message="Connectez-vous pour écrire à vos voisins et répondre à leurs annonces." />;
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && error && <Text style={s.errorText}>{error}</Text>}
      {!loading && !error && items.length === 0 && (
        <GlassCard style={s.card as any}>
          <Text style={s.title}>Aucune conversation</Text>
          <Text style={s.muted}>Ouvrez une annonce dans « Citoyens » et écrivez à votre voisin.</Text>
        </GlassCard>
      )}
      {items.map(item => (
        <TouchableOpacity key={item.id} activeOpacity={0.85} onPress={() => router.push(`/messages/${item.id}` as any)} accessibilityRole="button" accessibilityLabel={`Conversation avec ${item.other}`}>
          <GlassCard style={s.card as any}>
            <View style={s.row}>
              <Text style={s.title} numberOfLines={1}>{item.other}</Text>
              {item.unread > 0 && <View style={s.badge}><Text style={s.badgeText}>{item.unread}</Text></View>}
            </View>
            <Text style={s.listing} numberOfLines={1}>{item.title}</Text>
            <Text style={s.muted} numberOfLines={1}>{item.lastBody || ''}</Text>
          </GlassCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 150, gap: 12 },
    center: { paddingVertical: 40, alignItems: 'center' },
    card: { padding: 14, gap: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    title: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', flex: 1 },
    listing: { color: theme.colors.cyan, fontSize: 11, fontWeight: '700' },
    muted: { color: theme.colors.textSecondary, fontSize: 12 },
    errorText: { color: theme.colors.danger, fontSize: 13, fontWeight: '700' },
    badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  });
}
