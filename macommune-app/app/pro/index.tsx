// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Espace commerçant : liste des commerces rattachés au compte.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface MyCommerce {
  id: number;
  name: string;
  memberRole: string;
  chargesEnabled: boolean;
}

export default function ProHome() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [items, setItems] = useState<MyCommerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<MyCommerce[]>('merchant.myCommerces', {}, { authenticated: true });
    if (apiError || !data) setError(apiError || 'Espace commerçant indisponible.');
    else setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ title: 'Espace commerçant' }} />
        <AuthGate message="Connectez-vous avec le compte de votre commerce." />
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Stack.Screen options={{ title: 'Espace commerçant' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && error && (
        <GlassCard style={s.card as any}>
          <Text style={s.muted}>{error}</Text>
          <Text style={s.muted}>
            Ce compte n’est peut-être pas encore rattaché à un commerce. Contactez VilleConnect pour l’activer.
          </Text>
        </GlassCard>
      )}
      {!loading && !error && items.length === 0 && (
        <GlassCard style={s.card as any}>
          <Text style={s.muted}>Aucun commerce n’est rattaché à votre compte pour le moment.</Text>
        </GlassCard>
      )}
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.85}
          onPress={() => router.push(`/pro/${item.id}` as any)}
          accessibilityRole="button"
          accessibilityLabel={`Gérer ${item.name}`}
        >
          <GlassCard style={s.card as any}>
            <Text style={s.title}>{item.name}</Text>
            <Text style={item.chargesEnabled ? s.ok : s.warn}>
              {item.chargesEnabled ? 'Paiement en ligne actif' : 'Paiement en ligne à activer'}
            </Text>
          </GlassCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 60, alignItems: 'center' },
    card: { padding: 16, gap: 6 },
    title: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '900' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    ok: { color: theme.colors.success, fontSize: 12, fontWeight: '800' },
    warn: { color: theme.colors.warning, fontSize: 12, fontWeight: '800' },
  });
}
