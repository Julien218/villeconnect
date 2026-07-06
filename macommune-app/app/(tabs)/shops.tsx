// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { trpcQuery } from '@/shared/api-client';

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

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#10B981" />}
    >
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un commerce…"
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <Text style={s.count}>{filtered.length} commerces · Dour 7370</Text>
      {isMock && <Text style={s.mockBadge}>⚠️ Données hors-ligne (démo)</Text>}

      {loading && <ActivityIndicator color="#10B981" style={{ marginTop: 20 }} />}

      {!loading && filtered.map(shop => (
        <TouchableOpacity key={shop.id} style={s.card} activeOpacity={0.75}>
          <View style={s.shopIcon}><Text style={{ fontSize: 28 }}>{shop.emoji}</Text></View>
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
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#0A0F1E' },
  searchWrap:  { margin: 16, backgroundColor: '#111827', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, color: '#F9FAFB', fontSize: 14, paddingVertical: 13 },
  count:       { color: '#6B7280', fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginBottom: 4 },
  mockBadge:   { color: '#F59E0B', fontSize: 11, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },
  card:        { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  shopIcon:    { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  shopName:    { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  shopCat:     { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  shopAddr:    { color: '#6B7280', fontSize: 11, marginTop: 2 },
  promoBadge:  { borderRadius: 6, borderWidth: 1, borderColor: '#F59E0B44', backgroundColor: '#F59E0B22', paddingHorizontal: 7, paddingVertical: 2 },
  promoText:   { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
});
