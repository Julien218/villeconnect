// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Mes annonces : statut et clôture.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { listingKindLabel, listingPriceLabel } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface Mine {
  id: number; kind: string; title: string; priceCents: number | null; priceUnit: string | null;
  status: 'pending' | 'published' | 'closed' | 'rejected' | 'removed'; expiresAt: string;
}

const STATUS: Record<Mine['status'], string> = {
  pending: 'En attente de vérification', published: 'Publiée', closed: 'Clôturée',
  rejected: 'Refusée', removed: 'Retirée',
};

export default function MyListings() {
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [items, setItems] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await trpcQuery<Mine[]>('community.mine', {}, { authenticated: true });
    if (apiError || !data) setError(apiError || 'Liste indisponible.'); else { setItems(data); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Mes annonces' }} /><AuthGate message="Connectez-vous pour voir vos annonces." /></View>;
  }

  const close = async (id: number) => {
    const { error: apiError } = await trpcMutation('community.close', { id }, { authenticated: true });
    if (apiError) setError(apiError); else load();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Stack.Screen options={{ title: 'Mes annonces' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {error && <Text style={s.errorText}>{error}</Text>}
      {!loading && !error && items.length === 0 && <Text style={s.muted}>Vous n’avez pas encore publié d’annonce.</Text>}
      {items.map(item => (
        <GlassCard key={item.id} style={s.card as any}>
          <Text style={s.kind}>{listingKindLabel(item.kind).toUpperCase()}</Text>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.muted}>
            {listingPriceLabel(item.kind, item.priceCents, item.priceUnit)} · {STATUS[item.status]}
          </Text>
          {(item.status === 'published' || item.status === 'pending') && (
            <TouchableOpacity onPress={() => close(item.id)} style={s.btn} accessibilityRole="button" accessibilityLabel={`Clôturer ${item.title}`}>
              <Text style={s.btnText}>Clôturer (vendu, prêté, plus utile)</Text>
            </TouchableOpacity>
          )}
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
    kind: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    btn: { minHeight: 42, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borderCyan },
    btnText: { color: theme.colors.cyan, fontSize: 12, fontWeight: '800' },
  });
}
