// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpcQuery } from '@/shared/api-client';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

// Fallback utilisé UNIQUEMENT si l'API est injoignable (jamais affiché si des données réelles existent).
const MOCK_SHOPS = [
  { id: '1', name: 'Boucherie Dupont', category: 'Alimentation', emoji: '🥩', address: 'Rue de Mons 12', rating: 4.8 },
  { id: '2', name: 'Pharmacie du Centre', category: 'Santé', emoji: '💊', address: 'Grand-Place 3', rating: 4.6 },
];

const CAT_EMOJI: Record<string, string> = {
  Alimentation: '🥩', Santé: '💊', Auto: '🔧', Beauté: '✂️', Culture: '📚',
  Restauration: '🍕', 'Grande surface': '🛒', Commerce: '🏪',
};

function normalizeApiShop(sh: any) {
  return {
    id: String(sh.id),
    name: sh.name,
    category: sh.category,
    emoji: CAT_EMOJI[sh.category] || '🏪',
    address: sh.address || sh.city || '',
    rating: Number(sh.rating) || 0,
    hasPromotion: !!sh.hasPromotion,
    promotionText: sh.promotionText,
  };
}

export default function ShopsScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [search, setSearch]   = useState('');
  const [shops, setShops]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMock, setIsMock]   = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data, error } = await trpcQuery<any[]>('shops.list', { postalCode: '7370', limit: 50 });
    if (data && data.length > 0) {
      setShops(data.map(normalizeApiShop));
      setIsMock(false);
    } else {
      setShops(MOCK_SHOPS);
      setIsMock(true);
      if (error) console.warn('[shops] API indisponible, fallback mock:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = shops.filter(sh =>
    sh.name.toLowerCase().includes(search.toLowerCase()) ||
    sh.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un commerce…"
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <Text style={s.count}>{filtered.length} commerces · Dour 7370</Text>
      {isMock && <Text style={s.mockBadge}>⚠️ Données hors-ligne (démo)</Text>}

      {loading && <ActivityIndicator color={theme.colors.cyan} style={{ marginTop: 20 }} />}

      {!loading && filtered.map(shop => (
        <TouchableOpacity key={shop.id} activeOpacity={0.8}>
          <GlassCard style={s.card as any}>
            <View style={s.shopIcon}><Text style={{ fontSize: 26 }}>{shop.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.shopName}>{shop.name}</Text>
                {shop.hasPromotion && (
                  <View style={s.promoBadge}><Text style={s.promoText}>Promo</Text></View>
                )}
              </View>
              <Text style={s.shopCat}>{shop.category}  ·  ⭐ {shop.rating.toFixed(1)}</Text>
              <Text style={s.shopAddr}>📍 {shop.address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </GlassCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen:      { flex: 1, backgroundColor: theme.colors.bgDeep },
    searchWrap:  { margin: theme.spacing.md, backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
    searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 14, paddingVertical: 13 },
    count:       { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginBottom: 4 },
    mockBadge:   { color: theme.colors.warning, fontSize: 11, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },
    card:        { marginHorizontal: 16, marginBottom: 10, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
    shopIcon:    { width: 50, height: 50, borderRadius: theme.radius.md, backgroundColor: theme.colors.cyanSoft, alignItems: 'center', justifyContent: 'center' },
    shopName:    { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
    shopCat:     { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 },
    shopAddr:    { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    promoBadge:  { borderRadius: 6, borderWidth: 1, borderColor: theme.colors.warning + '44', backgroundColor: theme.colors.warning + '22', paddingHorizontal: 7, paddingVertical: 2 },
    promoText:   { fontSize: 10, fontWeight: '700', color: theme.colors.warning },
  });
}
