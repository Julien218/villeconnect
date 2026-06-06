// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';

interface FuelStation {
  id: string; name: string; address: string;
  diesel: number; e5: number; e10?: number; e85?: number;
  distance: string; isCheapest: boolean;
}

const MOCK_STATIONS: FuelStation[] = [
  { id:'1', name:'TotalEnergies Dour',   address:'Rue de Mons 1',    diesel:1.629, e5:1.789, e10:1.729, distance:'0.3 km', isCheapest:false },
  { id:'2', name:'Colruyt Dour',         address:'Zone commerciale', diesel:1.579, e5:1.739, e10:1.679, distance:'0.8 km', isCheapest:true  },
  { id:'3', name:'Q8 Saint-Ghislain',    address:'Route de Mons 45', diesel:1.639, e5:1.799, e10:1.739, distance:'3.2 km', isCheapest:false },
  { id:'4', name:'Carrefour Boussu',     address:'Rue du Centre 12', diesel:1.589, e5:1.749, e10:1.689, distance:'4.1 km', isCheapest:false },
];

export default function FuelScreen() {
  const [stations, setStations] = useState(MOCK_STATIONS);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<'diesel'|'e5'|'e10'>('diesel');

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const sorted = [...stations].sort((a, b) => a[selected] - b[selected]);
  const best = sorted[0];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
    >
      {/* Meilleur prix hero */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>💡 Meilleur prix autour de vous</Text>
        <Text style={s.heroStation}>{best.name}</Text>
        <Text style={s.heroPrice}>
          {selected === 'diesel' ? '🟡' : selected === 'e5' ? '🟢' : '🔵'}{' '}
          {best[selected].toFixed(3)} €/L
        </Text>
        <Text style={s.heroAddr}>📍 {best.address}  ·  {best.distance}</Text>
        <Text style={s.heroEco}>
          💰 Économie vs station la + chère : {((sorted[sorted.length-1][selected] - best[selected]) * 50).toFixed(2)}€ pour 50L
        </Text>
      </View>

      {/* Sélecteur carburant */}
      <View style={s.tabs}>
        {(['diesel','e5','e10'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, selected === t && s.tabActive]}
            onPress={() => setSelected(t)}
          >
            <Text style={[s.tabText, selected === t && s.tabTextActive]}>
              {t === 'diesel' ? 'Diesel' : t === 'e5' ? 'Essence 95' : 'E10'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionTitle}>Stations proches</Text>

      {sorted.map((st, i) => (
        <View key={st.id} style={[s.card, st.isCheapest && s.cardBest]}>
          {st.isCheapest && <View style={s.bestBadge}><Text style={s.bestText}>⭐ Le moins cher</Text></View>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.stName}>{i + 1}. {st.name}</Text>
              <Text style={s.stAddr}>📍 {st.address}  ·  🚗 {st.distance}</Text>
            </View>
            <Text style={[s.stPrice, st.isCheapest && { color: '#10B981' }]}>
              {st[selected].toFixed(3)}€
            </Text>
          </View>
          <View style={s.priceRow}>
            <View style={s.priceTag}><Text style={s.priceTagLabel}>Diesel</Text><Text style={s.priceTagVal}>{st.diesel.toFixed(3)}</Text></View>
            <View style={s.priceTag}><Text style={s.priceTagLabel}>E5</Text><Text style={s.priceTagVal}>{st.e5.toFixed(3)}</Text></View>
            {st.e10 && <View style={s.priceTag}><Text style={s.priceTagLabel}>E10</Text><Text style={s.priceTagVal}>{st.e10.toFixed(3)}</Text></View>}
          </View>
        </View>
      ))}

      <Text style={s.source}>Source : Statbel/SPF Économie Belgique · Mis à jour quotidiennement</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: '#0A0F1E' },
  hero:           { margin: 16, backgroundColor: '#111827', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', padding: 20 },
  heroLabel:      { color: '#F59E0B', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  heroStation:    { color: '#F9FAFB', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  heroPrice:      { color: '#F9FAFB', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  heroAddr:       { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  heroEco:        { color: '#10B981', fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: 8 },
  tabs:           { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 8 },
  tab:            { flex: 1, backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' },
  tabText:        { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  tabTextActive:  { color: '#F59E0B' },
  sectionTitle:   { color: '#F9FAFB', fontSize: 15, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card:           { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16 },
  cardBest:       { borderColor: 'rgba(16,185,129,0.3)' },
  bestBadge:      { alignSelf: 'flex-start', backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  bestText:       { color: '#10B981', fontSize: 11, fontWeight: '700' },
  stName:         { color: '#F9FAFB', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  stAddr:         { color: '#9CA3AF', fontSize: 12 },
  stPrice:        { color: '#F59E0B', fontSize: 24, fontWeight: '900' },
  priceRow:       { flexDirection: 'row', gap: 8, marginTop: 12 },
  priceTag:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, alignItems: 'center' },
  priceTagLabel:  { color: '#6B7280', fontSize: 10, fontWeight: '600' },
  priceTagVal:    { color: '#F9FAFB', fontSize: 13, fontWeight: '700', marginTop: 2 },
  source:         { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 16, marginHorizontal: 16 },
});
