// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

const SHOPS = [
  { id: '1', name: 'Boucherie Dupont', category: 'Alimentation', emoji: '🥩', address: 'Rue de Mons 12', open: true,  rating: 4.8 },
  { id: '2', name: 'Pharmacie du Centre', category: 'Santé', emoji: '💊', address: 'Grand-Place 3', open: true,  rating: 4.6 },
  { id: '3', name: 'Garage Lecomte', category: 'Auto', emoji: '🔧', address: 'Rue des Acacias 45', open: false, rating: 4.9 },
  { id: '4', name: 'Coiffeur Style+', category: 'Beauté', emoji: '✂️', address: 'Rue Neuve 7', open: true,  rating: 4.4 },
  { id: '5', name: 'Librairie Douroise', category: 'Culture', emoji: '📚', address: 'Place du Marché 1', open: true,  rating: 4.7 },
  { id: '6', name: 'Pizzeria Napoli', category: 'Restauration', emoji: '🍕', address: 'Rue de la Gare 22', open: true,  rating: 4.5 },
  { id: '7', name: 'Colruyt Dour', category: 'Grande surface', emoji: '🛒', address: 'Zone commerciale', open: true,  rating: 4.3 },
  { id: '8', name: 'Lavage Auto Express', category: 'Auto', emoji: '🚗', address: 'Route de Mons 89', open: false, rating: 4.2 },
];

export default function ShopsScreen() {
  const [search, setSearch] = useState('');
  const filtered = SHOPS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
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

      {filtered.map(shop => (
        <TouchableOpacity key={shop.id} style={s.card} activeOpacity={0.75}>
          <View style={s.shopIcon}><Text style={{ fontSize: 28 }}>{shop.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.shopName}>{shop.name}</Text>
              <View style={[s.openBadge, { backgroundColor: shop.open ? '#10B98122' : '#EF444422', borderColor: shop.open ? '#10B98144' : '#EF444444' }]}>
                <Text style={[s.openText, { color: shop.open ? '#10B981' : '#EF4444' }]}>{shop.open ? 'Ouvert' : 'Fermé'}</Text>
              </View>
            </View>
            <Text style={s.shopCat}>{shop.category}  ·  ⭐ {shop.rating}</Text>
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
  count:       { color: '#6B7280', fontSize: 12, fontWeight: '600', marginHorizontal: 16, marginBottom: 12 },
  card:        { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  shopIcon:    { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  shopName:    { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  shopCat:     { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  shopAddr:    { color: '#6B7280', fontSize: 11, marginTop: 2 },
  openBadge:   { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  openText:    { fontSize: 10, fontWeight: '700' },
});
