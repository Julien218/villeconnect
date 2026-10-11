// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Liste des commandes du citoyen connecté.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { formatEuros, orderStatusLabel, OrderStatus } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface OrderRow {
  id: number;
  commerceName?: string | null;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<OrderRow[]>('orders.mine', {}, { authenticated: true });
    if (apiError || !data) setError(apiError || 'Impossible de charger vos commandes.');
    else setOrders(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ title: 'Mes commandes' }} />
        <AuthGate message="Connectez-vous pour retrouver vos commandes." />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      <Stack.Screen options={{ title: 'Mes commandes' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && error && <Text style={s.errorText}>{error}</Text>}
      {!loading && !error && orders.length === 0 && (
        <GlassCard style={s.card as any}>
          <Text style={s.muted}>Vous n’avez pas encore de commande. Choisissez un commerce dans l’annuaire.</Text>
        </GlassCard>
      )}
      {orders.map(order => (
        <TouchableOpacity
          key={order.id}
          activeOpacity={0.85}
          onPress={() => router.push(`/orders/${order.id}` as any)}
          accessibilityRole="button"
          accessibilityLabel={`Commande chez ${order.commerceName || 'un commerce'}`}
        >
          <GlassCard style={s.card as any}>
            <View style={s.row}>
              <Text style={s.title}>{order.commerceName || 'Commerce'}</Text>
              <Text style={s.price}>{formatEuros(order.totalCents)}</Text>
            </View>
            <Text style={s.status}>{orderStatusLabel(order.status)}</Text>
            <Text style={s.muted}>{new Date(order.createdAt).toLocaleDateString('fr-BE')}</Text>
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
    card: { padding: 14, gap: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    title: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', flex: 1 },
    price: { color: theme.colors.cyan, fontSize: 14, fontWeight: '900' },
    status: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    errorText: { color: theme.colors.danger, fontSize: 13, fontWeight: '700' },
  });
}
