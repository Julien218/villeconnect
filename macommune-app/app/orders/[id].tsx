// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Détail d'une commande : statut, code de retrait (visible une fois payée), annulation avant paiement.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { formatEuros, isOrderInProgress, orderStatusLabel, OrderStatus } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface OrderDetail {
  id: number;
  commerceName?: string | null;
  status: OrderStatus;
  fulfillment?: 'pickup' | 'delivery';
  subtotalCents?: number;
  deliveryFeeCents?: number;
  totalCents: number;
  pickupCode?: string | null;
  deliveryAddress?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  note?: string | null;
  items: { name: string; quantity: number; unitPriceCents: number }[];
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (mode: 'first' | 'refresh' | 'silent' = 'first') => {
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'first') setLoading(true);
    const { data, error: apiError } = await trpcQuery<OrderDetail>('orders.get', { orderId }, { authenticated: true });
    if (apiError || !data) {
      if (mode !== 'silent') setError(apiError || 'Commande introuvable.');
    } else {
      setError(null);
      setOrder(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [orderId]);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  // Rafraîchit toutes les 6 s tant que la commande évolue (paiement, préparation).
  const inProgress = order ? isOrderInProgress(order.status) : false;
  const isDelivery = order?.fulfillment === 'delivery';
  useEffect(() => {
    if (!inProgress) return;
    timer.current = setInterval(() => load('silent'), 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [inProgress, load]);

  const cancel = async () => {
    setBusy(true);
    const { error: apiError } = await trpcMutation('orders.cancelMine', { orderId }, { authenticated: true });
    setBusy(false);
    if (apiError) setError(apiError);
    else load('silent');
  };

  if (!isLoggedIn) {
    return (
      <View style={s.screen}>
        <Stack.Screen options={{ title: 'Commande' }} />
        <AuthGate message="Connectez-vous pour voir cette commande." />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={theme.colors.cyan} />}
    >
      <Stack.Screen options={{ title: 'Commande' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && error && <Text style={s.errorText}>{error}</Text>}

      {order && (
        <>
          <GlassCard style={s.card as any}>
            <Text style={s.eyebrow}>{(order.commerceName || 'COMMERCE').toUpperCase()}</Text>
            <Text style={s.title}>{orderStatusLabel(order.status, order.fulfillment)}</Text>
            {isDelivery && order.deliveryAddress ? (
              <Text style={s.muted}>
                Adresse de livraison : {order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}
              </Text>
            ) : null}
            {order.status === 'pending_payment' && (
              <Text style={s.muted}>
                Le paiement n’est pas encore confirmé. Si vous l’avez terminé, cette page se met à jour toute seule.
              </Text>
            )}
          </GlassCard>

          {order.pickupCode ? (
            <GlassCard style={s.card as any}>
              <Text style={s.eyebrow}>{isDelivery ? 'CODE DE LIVRAISON' : 'CODE DE RETRAIT'}</Text>
              <Text style={s.code} accessibilityLabel={`Code de retrait ${order.pickupCode.split('').join(' ')}`}>
                {order.pickupCode}
              </Text>
              <Text style={s.muted}>
                {isDelivery
                  ? 'Donnez ce code au livreur à la réception : il confirme que la commande vous a bien été remise.'
                  : 'Présentez ce code au commerçant pour récupérer votre commande.'}
              </Text>
            </GlassCard>
          ) : null}

          <GlassCard style={s.card as any}>
            {order.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={s.row}>
                <Text style={s.rowText}>{item.quantity} × {item.name}</Text>
                <Text style={s.rowText}>{formatEuros(item.unitPriceCents * item.quantity)}</Text>
              </View>
            ))}
            {isDelivery ? (
              <View style={s.row}>
                <Text style={s.rowText}>Livraison</Text>
                <Text style={s.rowText}>{order.deliveryFeeCents ? formatEuros(order.deliveryFeeCents) : 'Offerte'}</Text>
              </View>
            ) : null}
            <View style={[s.row, s.totalRow]}>
              <Text style={s.totalText}>Total</Text>
              <Text style={s.totalText}>{formatEuros(order.totalCents)}</Text>
            </View>
            {order.note ? <Text style={s.muted}>Remarque : {order.note}</Text> : null}
          </GlassCard>

          {order.status === 'pending_payment' && (
            <TouchableOpacity onPress={cancel} disabled={busy} style={s.cancelBtn} accessibilityRole="button">
              <Text style={s.cancelText}>{busy ? 'Annulation…' : 'Annuler cette commande'}</Text>
            </TouchableOpacity>
          )}
          {order.status === 'paid' || order.status === 'preparing' || order.status === 'ready' ? (
            <Text style={s.muted}>
              Pour une modification ou un remboursement, contactez directement le commerçant.
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 60, alignItems: 'center' },
    card: { padding: 16, gap: 8 },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    title: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '900' },
    code: { color: theme.colors.textPrimary, fontSize: 40, fontWeight: '900', letterSpacing: 8, textAlign: 'center', paddingVertical: 8 },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    rowText: { color: theme.colors.textSecondary, fontSize: 13 },
    totalRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 4 },
    totalText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900' },
    errorText: { color: theme.colors.danger, fontSize: 13, fontWeight: '700' },
    cancelBtn: { minHeight: 46, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.danger },
    cancelText: { color: theme.colors.danger, fontSize: 13, fontWeight: '800' },
  });
}
