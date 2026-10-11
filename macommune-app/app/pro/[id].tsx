// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Gestion d'un commerce : commandes (retrait ou livraison) par code, produits, livraison, paiement en ligne (Stripe).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Linking, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { formatEuros, orderStatusLabel, parseEuroToCents, OrderStatus } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

type Tab = 'orders' | 'products' | 'delivery' | 'payment';

interface ProOrder {
  id: number;
  status: OrderStatus;
  fulfillment?: 'pickup' | 'delivery';
  totalCents: number;
  deliveryFeeCents?: number;
  note?: string | null;
  deliveryAddress?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  deliveryPhone?: string | null;
  createdAt: string;
  items: { name: string; quantity: number; unitPriceCents: number }[];
}
interface ProProduct {
  id: number;
  name: string;
  description?: string | null;
  priceCents: number;
  stock: number | null;
  isActive: boolean;
}
interface DeliverySettings {
  enabled: boolean;
  feeCents: number;
  freeFromCents: number | null;
  postalCodes: string[];
  note: string | null;
}
interface PayStatus { connected: boolean; chargesEnabled: boolean; detailsSubmitted: boolean }

export default function ProCommerce() {
  const { id, retour, refresh } = useLocalSearchParams<{ id: string; retour?: string; refresh?: string }>();
  const commerceId = Number(id);
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  // Retour depuis Stripe (?retour=1 ou ?refresh=1) : on ouvre directement l'onglet Paiement.
  const [tab, setTab] = useState<Tab>(retour || refresh ? 'payment' : 'orders');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Commandes
  const [orders, setOrders] = useState<ProOrder[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // Produits
  const [products, setProducts] = useState<ProProduct[]>([]);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pStock, setPStock] = useState('');
  // Livraison
  const [dEnabled, setDEnabled] = useState(false);
  const [dFee, setDFee] = useState('');
  const [dFreeFrom, setDFreeFrom] = useState('');
  const [dCodes, setDCodes] = useState('');
  const [dNote, setDNote] = useState('');
  // Paiement
  const [pay, setPay] = useState<PayStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    const { data, error } = await trpcQuery<ProOrder[]>('merchant.orders', { commerceId }, { authenticated: true });
    if (error || !data) setMessage({ text: error || 'Commandes indisponibles.', ok: false });
    else setOrders(data);
  }, [commerceId]);

  const loadProducts = useCallback(async () => {
    const { data, error } = await trpcQuery<ProProduct[]>('merchant.productList', { commerceId }, { authenticated: true });
    if (error || !data) setMessage({ text: error || 'Produits indisponibles.', ok: false });
    else setProducts(data);
  }, [commerceId]);

  const loadDelivery = useCallback(async () => {
    const { data, error } = await trpcQuery<DeliverySettings>('merchant.deliveryGet', { commerceId }, { authenticated: true });
    if (error || !data) { setMessage({ text: error || 'Réglages de livraison indisponibles.', ok: false }); return; }
    setDEnabled(data.enabled);
    setDFee(data.feeCents ? (data.feeCents / 100).toFixed(2).replace('.', ',') : '');
    setDFreeFrom(data.freeFromCents !== null ? (data.freeFromCents / 100).toFixed(2).replace('.', ',') : '');
    setDCodes(data.postalCodes.join(', '));
    setDNote(data.note || '');
  }, [commerceId]);

  const loadPay = useCallback(async () => {
    const { data, error } = await trpcMutation<PayStatus>('merchant.refreshPaymentStatus', { commerceId }, { authenticated: true });
    if (error || !data) setMessage({ text: error || 'Statut de paiement indisponible.', ok: false });
    else setPay(data);
  }, [commerceId]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setMessage(null);
    setLoading(true);
    const task = tab === 'orders' ? loadOrders()
      : tab === 'products' ? loadProducts()
      : tab === 'delivery' ? loadDelivery()
      : loadPay();
    task.finally(() => setLoading(false));
  }, [tab, isLoggedIn, loadOrders, loadProducts, loadDelivery, loadPay]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Commerce' }} /><AuthGate message="Connectez-vous pour gérer votre commerce." /></View>;
  }

  const confirmPickup = async () => {
    if (code.trim().length < 4) { setMessage({ text: 'Saisissez le code du client.', ok: false }); return; }
    setBusy(true);
    const { error } = await trpcMutation('merchant.confirmPickup', { commerceId, pickupCode: code.trim() }, { authenticated: true });
    setBusy(false);
    if (error) setMessage({ text: error, ok: false });
    else { setMessage({ text: 'Retrait confirmé.', ok: true }); setCode(''); loadOrders(); }
  };

  const setStatus = async (orderId: number, status: 'preparing' | 'ready') => {
    setBusy(true);
    const { error } = await trpcMutation('merchant.setOrderStatus', { commerceId, orderId, status }, { authenticated: true });
    setBusy(false);
    if (error) setMessage({ text: error, ok: false }); else loadOrders();
  };

  const addProduct = async () => {
    const priceCents = parseEuroToCents(pPrice);
    if (pName.trim().length < 2 || priceCents === null) {
      setMessage({ text: 'Indiquez un nom et un prix valide (ex. 4,50).', ok: false });
      return;
    }
    const stockText = pStock.trim();
    const stock = stockText === '' ? null : Number.parseInt(stockText, 10);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setMessage({ text: 'Stock invalide (laisser vide = illimité).', ok: false });
      return;
    }
    setBusy(true);
    const { error } = await trpcMutation('merchant.productSave', { commerceId, name: pName.trim(), priceCents, stock, isActive: true }, { authenticated: true });
    setBusy(false);
    if (error) setMessage({ text: error, ok: false });
    else { setPName(''); setPPrice(''); setPStock(''); setMessage({ text: 'Produit ajouté.', ok: true }); loadProducts(); }
  };

  const toggleProduct = async (product: ProProduct, isActive: boolean) => {
    const { error } = await trpcMutation('merchant.productSave', {
      commerceId, id: product.id, name: product.name, description: product.description || undefined,
      priceCents: product.priceCents, stock: product.stock, isActive,
    }, { authenticated: true });
    if (error) setMessage({ text: error, ok: false }); else loadProducts();
  };

  const saveDelivery = async () => {
    // Champ vide = livraison gratuite (frais) ou pas de seuil de gratuité.
    const feeCents = dFee.trim() === '' ? 0 : parseEuroToCents(dFee);
    const freeFromCents = dFreeFrom.trim() === '' ? null : parseEuroToCents(dFreeFrom);
    if (feeCents === null || (dFreeFrom.trim() !== '' && freeFromCents === null)) {
      setMessage({ text: 'Montant invalide (ex. 3,50).', ok: false });
      return;
    }
    const postalCodes = dCodes.split(/[\s,;]+/).map(c => c.trim()).filter(Boolean);
    if (postalCodes.some(c => !/^\d{4}$/.test(c))) {
      setMessage({ text: 'Codes postaux à 4 chiffres, séparés par des virgules (ex. 7370, 7380).', ok: false });
      return;
    }
    setBusy(true);
    const { error } = await trpcMutation('merchant.deliverySave', {
      commerceId, enabled: dEnabled, feeCents, freeFromCents, postalCodes, note: dNote.trim() || undefined,
    }, { authenticated: true });
    setBusy(false);
    if (error) setMessage({ text: error, ok: false });
    else setMessage({ text: dEnabled ? 'Livraison activée.' : 'Réglages enregistrés (livraison désactivée).', ok: true });
  };

  const startOnboarding = async () => {
    setBusy(true);
    const { data, error } = await trpcMutation<{ url: string }>('merchant.startPaymentOnboarding', { commerceId }, { authenticated: true });
    setBusy(false);
    if (error || !data?.url) { setMessage({ text: error || 'Activation impossible.', ok: false }); return; }
    try { await Linking.openURL(data.url); } catch { setMessage({ text: 'Impossible d’ouvrir la page Stripe.', ok: false }); }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Mon commerce' }} />
      <View style={s.tabs}>
        {([['orders', 'Commandes'], ['products', 'Produits'], ['delivery', 'Livraison'], ['payment', 'Paiement']] as [Tab, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}>
            <Text style={[s.tabText, tab === key && s.tabTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {message && <Text style={message.ok ? s.okText : s.errorText} accessibilityLiveRegion="polite">{message.text}</Text>}
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}

      {tab === 'orders' && (
        <>
          <GlassCard style={s.card as any}>
            <Text style={s.title}>Retrait ou livraison</Text>
            <Text style={s.muted}>Saisissez le code que le client vous montre (ou donne au livreur) pour clôturer la commande.</Text>
            <TextInput
              style={s.input} value={code} onChangeText={t => setCode(t.toUpperCase())}
              autoCapitalize="characters" autoCorrect={false} maxLength={12}
              placeholder="Code du client (6 caractères)" placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity onPress={confirmPickup} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
              <Text style={s.btnText}>Confirmer la remise</Text>
            </TouchableOpacity>
          </GlassCard>
          {orders.length === 0 && !loading && <Text style={s.muted}>Aucune commande payée pour le moment.</Text>}
          {orders.map(order => (
            <GlassCard key={order.id} style={s.card as any}>
              <View style={s.row}>
                <Text style={s.title}>Commande #{order.id}</Text>
                <Text style={s.price}>{formatEuros(order.totalCents)}</Text>
              </View>
              <Text style={s.status}>
                {order.fulfillment === 'delivery' ? 'LIVRAISON · ' : 'RETRAIT · '}{orderStatusLabel(order.status, order.fulfillment)}
              </Text>
              {order.fulfillment === 'delivery' && order.deliveryAddress ? (
                <Text style={s.muted}>
                  {order.deliveryAddress}, {order.deliveryPostalCode} {order.deliveryCity}
                  {order.deliveryPhone ? ` · ${order.deliveryPhone}` : ''}
                </Text>
              ) : null}
              {order.items.map((item, i) => (
                <Text key={i} style={s.muted}>{item.quantity} × {item.name}</Text>
              ))}
              {order.note ? <Text style={s.muted}>Remarque : {order.note}</Text> : null}
              {order.status === 'paid' && (
                <TouchableOpacity onPress={() => setStatus(order.id, 'preparing')} disabled={busy} style={s.btn} accessibilityRole="button">
                  <Text style={s.btnText}>Passer en préparation</Text>
                </TouchableOpacity>
              )}
              {(order.status === 'paid' || order.status === 'preparing') && (
                <TouchableOpacity onPress={() => setStatus(order.id, 'ready')} disabled={busy} style={s.btn} accessibilityRole="button">
                  <Text style={s.btnText}>{order.fulfillment === 'delivery' ? 'Partir en livraison' : 'Marquer prête'}</Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          ))}
        </>
      )}

      {tab === 'products' && (
        <>
          <GlassCard style={s.card as any}>
            <Text style={s.title}>Ajouter un produit</Text>
            <TextInput style={s.input} value={pName} onChangeText={setPName} maxLength={190} placeholder="Nom" placeholderTextColor={theme.colors.textMuted} />
            <TextInput style={s.input} value={pPrice} onChangeText={setPPrice} keyboardType="decimal-pad" placeholder="Prix en € (ex. 4,50)" placeholderTextColor={theme.colors.textMuted} />
            <TextInput style={s.input} value={pStock} onChangeText={setPStock} keyboardType="number-pad" placeholder="Stock (vide = illimité)" placeholderTextColor={theme.colors.textMuted} />
            <TouchableOpacity onPress={addProduct} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
              <Text style={s.btnText}>Ajouter</Text>
            </TouchableOpacity>
          </GlassCard>
          {products.map(product => (
            <GlassCard key={product.id} style={s.productCard as any}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{product.name}</Text>
                <Text style={s.price}>{formatEuros(product.priceCents)}</Text>
                <Text style={s.muted}>{product.stock === null ? 'Stock illimité' : `Stock : ${product.stock}`}</Text>
              </View>
              <Switch value={product.isActive} onValueChange={v => toggleProduct(product, v)} accessibilityLabel={`Afficher ${product.name} en vitrine`} />
            </GlassCard>
          ))}
        </>
      )}

      {tab === 'delivery' && (
        <GlassCard style={s.card as any}>
          <View style={s.row}>
            <Text style={s.title}>Livraison à domicile</Text>
            <Switch value={dEnabled} onValueChange={setDEnabled} accessibilityLabel="Proposer la livraison" />
          </View>
          <Text style={s.muted}>
            Vous livrez vous-même. Les frais de livraison vous reviennent entièrement : la commission VilleConnect porte uniquement sur les produits.
          </Text>
          <Text style={s.label}>Frais de livraison (€)</Text>
          <TextInput style={s.input} value={dFee} onChangeText={setDFee} keyboardType="decimal-pad" placeholder="Vide = livraison gratuite" placeholderTextColor={theme.colors.textMuted} accessibilityLabel="Frais de livraison en euros" />
          <Text style={s.label}>Livraison offerte dès (€)</Text>
          <TextInput style={s.input} value={dFreeFrom} onChangeText={setDFreeFrom} keyboardType="decimal-pad" placeholder="Facultatif (ex. 30)" placeholderTextColor={theme.colors.textMuted} accessibilityLabel="Livraison offerte à partir de" />
          <Text style={s.label}>Codes postaux livrés</Text>
          <TextInput style={s.input} value={dCodes} onChangeText={setDCodes} placeholder="Ex. 7370, 7380" placeholderTextColor={theme.colors.textMuted} accessibilityLabel="Codes postaux livrés" />
          <Text style={s.label}>Information pour vos clients</Text>
          <TextInput style={s.input} value={dNote} onChangeText={setDNote} maxLength={200} placeholder="Ex. livraison le mardi et le vendredi" placeholderTextColor={theme.colors.textMuted} accessibilityLabel="Information de livraison pour les clients" />
          <TouchableOpacity onPress={saveDelivery} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
            <Text style={s.btnText}>Enregistrer</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {tab === 'payment' && (
        <GlassCard style={s.card as any}>
          <Text style={s.title}>Paiement en ligne</Text>
          {pay?.chargesEnabled ? (
            <Text style={s.okText}>Actif : vos clients peuvent payer en ligne (Bancontact, carte). L’argent arrive directement sur votre compte Stripe ; VilleConnect prélève sa commission.</Text>
          ) : (
            <Text style={s.muted}>
              {pay?.connected
                ? 'Votre compte Stripe est créé mais pas encore prêt. Terminez la saisie des informations demandées.'
                : 'Reliez un compte Stripe pour encaisser en ligne. Vous gardez la main sur vos remboursements. Pensez à activer Bancontact dans votre tableau de bord Stripe.'}
            </Text>
          )}
          {!pay?.chargesEnabled && (
            <TouchableOpacity onPress={startOnboarding} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
              <Text style={s.btnText}>{pay?.connected ? 'Continuer l’activation' : 'Activer le paiement en ligne'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setLoading(true); loadPay().finally(() => setLoading(false)); }} style={s.linkBtn} accessibilityRole="button">
            <Text style={s.linkText}>Actualiser le statut</Text>
          </TouchableOpacity>
        </GlassCard>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 30, alignItems: 'center' },
    tabs: { flexDirection: 'row', gap: 8 },
    tab: { flex: 1, minHeight: 40, paddingHorizontal: 4, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
    tabOn: { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.cyan },
    tabText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800' },
    tabTextOn: { color: theme.colors.cyan },
    card: { padding: 14, gap: 10 },
    productCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    title: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    price: { color: theme.colors.cyan, fontSize: 14, fontWeight: '900' },
    status: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' },
    label: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '800', marginBottom: -4 },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    okText: { color: theme.colors.success, fontSize: 12, fontWeight: '700', lineHeight: 18 },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    btn: { minHeight: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    off: { opacity: 0.5 },
    linkBtn: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
    linkText: { color: theme.colors.cyan, fontSize: 12, fontWeight: '800' },
  });
}
