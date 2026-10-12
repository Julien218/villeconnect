// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Vitrine d'un commerce : produits, panier, commande avec retrait ou livraison et paiement en ligne.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { formatEuros } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';

interface Product {
  id: number;
  name: string;
  description?: string | null;
  priceCents: number;
  available: boolean;
}

interface DeliveryOffer {
  feeCents: number;
  freeFromCents: number | null;
  postalCodes: string[];
  note: string | null;
}

interface Catalog {
  commerce: { id: number; name: string };
  acceptsOnlineOrders: boolean;
  delivery: DeliveryOffer | null;
  minOrderCents: number;
  products: Product[];
}

export default function CommerceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commerceId = Number(id);
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '');
  const [city, setCity] = useState(user?.city || '');
  const [phone, setPhone] = useState('');

  // Le profil peut arriver après le premier rendu : on pré-remplit sans écraser une saisie.
  useEffect(() => {
    if (user?.postalCode) setPostalCode(current => current || user.postalCode || '');
    if (user?.city) setCity(current => current || user.city || '');
  }, [user?.postalCode, user?.city]);

  const load = useCallback(async (isRefresh = false) => {
    if (!Number.isInteger(commerceId) || commerceId <= 0) {
      setError('Commerce introuvable.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<Catalog>('orders.catalog', { commerceId });
    if (apiError || !data) {
      setCatalog(null);
      setError(apiError || 'Ce commerce est momentanément indisponible.');
    } else {
      setCatalog(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [commerceId]);

  useEffect(() => { load(); }, [load]);

  const lines = useMemo(() => {
    if (!catalog) return [];
    return catalog.products
      .filter(product => (cart[product.id] || 0) > 0)
      .map(product => ({ product, quantity: cart[product.id] }));
  }, [catalog, cart]);

  const subtotalCents = lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const minCents = catalog?.minOrderCents ?? 0;
  const belowMinimum = subtotalCents > 0 && subtotalCents < minCents;

  // Affichage seulement : le serveur recalcule les frais et refuse un code postal non livré.
  const delivery = catalog?.delivery || null;
  const isDelivery = mode === 'delivery' && delivery !== null;
  const outOfZone = isDelivery && /^\d{4}$/.test(postalCode.trim()) && !delivery!.postalCodes.includes(postalCode.trim());
  const deliveryFeeCents = !isDelivery
    ? 0
    : delivery!.freeFromCents !== null && subtotalCents >= delivery!.freeFromCents ? 0 : delivery!.feeCents;
  const totalCents = subtotalCents + deliveryFeeCents;
  const deliveryIncomplete = isDelivery && (
    address.trim().length < 5 || !/^\d{4}$/.test(postalCode.trim()) || city.trim().length < 2 || phone.trim().length < 6
  );

  const change = (productId: number, delta: number) => {
    setCart(current => {
      const next = Math.max(0, Math.min(20, (current[productId] || 0) + delta));
      const updated = { ...current };
      if (next === 0) delete updated[productId];
      else updated[productId] = next;
      return updated;
    });
  };

  const order = async () => {
    setOrderError(null);
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (!user?.emailVerified) {
      setOrderError('Vérifiez votre adresse email (lien reçu à l’inscription) pour pouvoir commander.');
      return;
    }
    setSubmitting(true);
    const { data, error: apiError } = await trpcMutation<{ orderId: number; checkoutUrl: string }>(
      'orders.create',
      {
        commerceId,
        items: lines.map(line => ({ productId: line.product.id, quantity: line.quantity })),
        note: note.trim() || undefined,
        fulfillment: isDelivery ? 'delivery' : 'pickup',
        delivery: isDelivery
          ? { address: address.trim(), postalCode: postalCode.trim(), city: city.trim(), phone: phone.trim() }
          : undefined,
      },
      { authenticated: true }
    );
    setSubmitting(false);
    if (apiError || !data) {
      setOrderError(apiError || 'Commande impossible pour le moment.');
      return;
    }
    // On ne suit que l'adresse de paiement renvoyée par le serveur, jamais une adresse saisie.
    try {
      await Linking.openURL(data.checkoutUrl);
    } catch {
      setOrderError('Impossible d’ouvrir la page de paiement. Retrouvez votre commande dans « Mes commandes ».');
    }
    router.replace(`/orders/${data.orderId}` as any);
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      <Stack.Screen options={{ title: catalog?.commerce.name || 'Commerce' }} />

      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}

      {!loading && error && (
        <GlassCard style={s.card as any}>
          <Text style={s.title}>Commerce indisponible</Text>
          <Text style={s.muted}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={s.secondaryBtn} accessibilityRole="button">
            <Text style={s.secondaryText}>Réessayer</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {!loading && catalog && (
        <>
          <GlassCard style={s.card as any}>
            <Text style={s.eyebrow}>{catalog.delivery ? 'RETRAIT EN COMMERCE OU LIVRAISON' : 'COMMANDE AVEC RETRAIT EN COMMERCE'}</Text>
            <Text style={s.title}>{catalog.commerce.name}</Text>
            <Text style={s.muted}>
              {catalog.acceptsOnlineOrders
                ? `Payez en ligne (Bancontact ou carte), puis retirez avec votre code${catalog.delivery ? ' ou faites-vous livrer' : ''}. Commande minimale : ${formatEuros(catalog.minOrderCents)}.`
                : 'Ce commerce n’accepte pas encore les commandes en ligne.'}
            </Text>
            {catalog.acceptsOnlineOrders && catalog.delivery && (
              <Text style={s.muted}>
                Livraison : {catalog.delivery.feeCents > 0 ? formatEuros(catalog.delivery.feeCents) : 'offerte'}
                {catalog.delivery.freeFromCents !== null && catalog.delivery.feeCents > 0
                  ? `, offerte dès ${formatEuros(catalog.delivery.freeFromCents)}` : ''}
                {` · ${catalog.delivery.postalCodes.join(', ')}`}
              </Text>
            )}
          </GlassCard>

          {catalog.products.length === 0 && (
            <GlassCard style={s.card as any}>
              <Text style={s.muted}>Aucun produit n’est proposé pour le moment.</Text>
            </GlassCard>
          )}

          {catalog.products.map(product => {
            const quantity = cart[product.id] || 0;
            return (
              <GlassCard key={product.id} style={s.productCard as any}>
                <View style={{ flex: 1 }}>
                  <Text style={s.productName}>{product.name}</Text>
                  {product.description ? <Text style={s.muted} numberOfLines={3}>{product.description}</Text> : null}
                  <Text style={s.price}>{formatEuros(product.priceCents)}</Text>
                  {!product.available && <Text style={s.soldOut}>Épuisé</Text>}
                </View>
                {catalog.acceptsOnlineOrders && product.available && (
                  <View style={s.stepper}>
                    <TouchableOpacity
                      onPress={() => change(product.id, -1)} disabled={quantity === 0}
                      style={[s.stepBtn, quantity === 0 && s.stepBtnOff]}
                      accessibilityRole="button" accessibilityLabel={`Retirer un ${product.name}`}
                    >
                      <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={s.qty}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => change(product.id, 1)}
                      style={s.stepBtn}
                      accessibilityRole="button" accessibilityLabel={`Ajouter un ${product.name}`}
                    >
                      <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            );
          })}

          {lines.length > 0 && (
            <GlassCard style={s.card as any}>
              <Text style={s.title}>Votre panier</Text>
              {lines.map(line => (
                <View key={line.product.id} style={s.row}>
                  <Text style={s.rowText}>{line.quantity} × {line.product.name}</Text>
                  <Text style={s.rowText}>{formatEuros(line.product.priceCents * line.quantity)}</Text>
                </View>
              ))}
              {delivery && (
                <View style={s.modeRow} accessibilityRole="radiogroup">
                  {([['pickup', 'Retrait', 'storefront-outline'], ['delivery', 'Livraison', 'bicycle-outline']] as const).map(([value, label, icon]) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setMode(value)}
                      style={[s.modeBtn, mode === value && s.modeBtnOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: mode === value }}
                    >
                      <Ionicons name={icon} size={16} color={mode === value ? theme.colors.cyan : theme.colors.textSecondary} />
                      <Text style={[s.modeText, mode === value && s.modeTextOn]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {isDelivery && (
                <View style={{ gap: 8 }}>
                  <TextInput
                    style={s.input} value={address} onChangeText={setAddress} maxLength={255}
                    placeholder="Rue et numéro" placeholderTextColor={theme.colors.textMuted}
                    autoComplete="street-address"
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[s.input, { width: 96, flexShrink: 0 }]} value={postalCode} onChangeText={setPostalCode} maxLength={4}
                      placeholder="7370" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad"
                    />
                    <TextInput
                      style={[s.input, { flex: 1, minWidth: 0 }]} value={city} onChangeText={setCity} maxLength={120}
                      placeholder="Localité" placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <TextInput
                    style={s.input} value={phone} onChangeText={setPhone} maxLength={40}
                    placeholder="Téléphone (pour le livreur)" placeholderTextColor={theme.colors.textMuted}
                    keyboardType="phone-pad" autoComplete="tel"
                  />
                  {delivery?.note ? <Text style={s.muted}>{delivery.note}</Text> : null}
                  {outOfZone && (
                    <Text style={s.warning}>
                      Ce commerce livre seulement : {delivery!.postalCodes.join(', ')}. Choisissez le retrait.
                    </Text>
                  )}
                </View>
              )}

              {isDelivery && (
                <View style={s.row}>
                  <Text style={s.rowText}>Livraison</Text>
                  <Text style={s.rowText}>{deliveryFeeCents > 0 ? formatEuros(deliveryFeeCents) : 'Offerte'}</Text>
                </View>
              )}
              <View style={[s.row, s.totalRow]}>
                <Text style={s.totalText}>Total</Text>
                <Text style={s.totalText}>{formatEuros(totalCents)}</Text>
              </View>

              <TextInput
                style={s.input} value={note} onChangeText={setNote} maxLength={300}
                placeholder="Remarque pour le commerçant (facultatif)"
                placeholderTextColor={theme.colors.textMuted}
              />

              {belowMinimum && (
                <Text style={s.warning}>Commande minimale : {formatEuros(minCents)}.</Text>
              )}
              {orderError && <Text style={s.errorText} accessibilityLiveRegion="polite">{orderError}</Text>}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={order}
                disabled={submitting || belowMinimum || outOfZone || deliveryIncomplete}
                accessibilityRole="button"
                accessibilityLabel="Commander et payer"
              >
                <LinearGradient
                  colors={[theme.colors.electric, theme.colors.cyan]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[s.primaryBtn, (submitting || belowMinimum || outOfZone || deliveryIncomplete) && s.disabled]}
                >
                  {submitting
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={s.primaryText}>{isLoggedIn ? 'Commander et payer' : 'Se connecter pour commander'}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          )}
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
    card: { padding: 16, gap: 10 },
    productCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    title: { color: theme.colors.textPrimary, fontSize: 19, fontWeight: '900' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    productName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    price: { color: theme.colors.cyan, fontSize: 14, fontWeight: '900', marginTop: 4 },
    soldOut: { color: theme.colors.warning, fontSize: 11, fontWeight: '800', marginTop: 4 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.cyanSoft, borderWidth: 1, borderColor: theme.colors.border,
    },
    stepBtnOff: { opacity: 0.4 },
    qty: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '900', minWidth: 20, textAlign: 'center' },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    rowText: { color: theme.colors.textSecondary, fontSize: 13 },
    totalRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 4 },
    totalText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900' },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 13,
    },
    modeRow: { flexDirection: 'row', gap: 8 },
    modeBtn: {
      flex: 1, minHeight: 44, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    modeBtnOn: { borderColor: theme.colors.cyan, backgroundColor: theme.colors.cyanSoft },
    modeText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '800' },
    modeTextOn: { color: theme.colors.cyan },
    warning: { color: theme.colors.warning, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    primaryBtn: { minHeight: 50, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    disabled: { opacity: 0.5 },
    secondaryBtn: {
      minHeight: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.borderCyan,
    },
    secondaryText: { color: theme.colors.cyan, fontSize: 13, fontWeight: '800' },
  });
}
