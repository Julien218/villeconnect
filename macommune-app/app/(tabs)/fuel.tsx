// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpcQuery } from '@/shared/api-client';
import { theme } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

interface FuelStation {
  id: string; name: string; address: string;
  diesel: number; e5: number; e10?: number;
  distance: string; isMock?: boolean;
}

// Fallback local si l'API et son propre fallback interne sont tous deux injoignables.
const MOCK_STATIONS: FuelStation[] = [
  { id:'1', name:'Colruyt Dour', address:'Zone commerciale', diesel:1.579, e5:1.739, e10:1.679, distance:'0.8 km', isMock: true },
];

function normalize(st: any): FuelStation {
  return {
    id: String(st.id),
    name: st.name,
    address: st.address,
    diesel: Number(st.price_diesel),
    e5: Number(st.price_e5),
    e10: st.price_e10 != null ? Number(st.price_e10) : undefined,
    distance: typeof st.distance === 'number' ? `${st.distance.toFixed(1)} km` : String(st.distance),
    isMock: !!st._mock,
  };
}

export default function FuelScreen() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<'diesel'|'e5'|'e10'>('diesel');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const { data, error } = await trpcQuery<any[]>('fuel.getStations', { postalCode: '7370', fuelType: selected.toUpperCase() });
    if (data && data.length > 0) setStations(data.map(normalize));
    else { setStations(MOCK_STATIONS); if (error) console.warn('[fuel] API indisponible:', error); }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [selected]);

  if (loading) {
    return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={theme.colors.cyan} /></View>;
  }

  const sorted = [...stations].sort((a, b) => (a[selected] ?? 999) - (b[selected] ?? 999));
  const best = sorted[0];
  const usingMock = stations.some(st => st.isMock);

  if (!best) {
    return <View style={s.screen}><Text style={s.source}>Aucune station disponible.</Text></View>;
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      {usingMock && <Text style={s.mockBadge}>⚠️ Prix de démonstration — intégration Statbel en cours de branchement DB</Text>}

      {/* Meilleur prix hero */}
      <LinearGradient
        colors={[theme.colors.navyGrad2, theme.colors.cyanGrad1, theme.colors.cyanGrad2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Text style={s.heroLabel}>💡 MEILLEUR PRIX AUTOUR DE VOUS</Text>
        <Text style={s.heroStation}>{best.name}</Text>
        <Text style={s.heroPrice}>{(best[selected] ?? 0).toFixed(3)} €/L</Text>
        <Text style={s.heroAddr}>📍 {best.address}  ·  {best.distance}</Text>
        {sorted.length > 1 && (
          <View style={s.heroEcoWrap}>
            <Text style={s.heroEco}>
              💰 Économie vs station la + chère : {(((sorted[sorted.length-1][selected] ?? 0) - (best[selected] ?? 0)) * 50).toFixed(2)}€ pour 50L
            </Text>
          </View>
        )}
      </LinearGradient>

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

      <Text style={s.sectionTitle}>STATIONS PROCHES</Text>

      {sorted.map((st, i) => (
        <GlassCard key={st.id} style={[s.card, i === 0 && s.cardBest] as any}>
          {i === 0 && <View style={s.bestBadge}><Text style={s.bestText}>⭐ Le moins cher</Text></View>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.stName}>{i + 1}. {st.name}</Text>
              <Text style={s.stAddr}>📍 {st.address}  ·  🚗 {st.distance}</Text>
            </View>
            <Text style={[s.stPrice, i === 0 && { color: theme.colors.success }]}>
              {(st[selected] ?? 0).toFixed(3)}€
            </Text>
          </View>
          <View style={s.priceRow}>
            <View style={s.priceTag}><Text style={s.priceTagLabel}>Diesel</Text><Text style={s.priceTagVal}>{st.diesel.toFixed(3)}</Text></View>
            <View style={s.priceTag}><Text style={s.priceTagLabel}>E5</Text><Text style={s.priceTagVal}>{st.e5.toFixed(3)}</Text></View>
            {st.e10 && <View style={s.priceTag}><Text style={s.priceTagLabel}>E10</Text><Text style={s.priceTagVal}>{st.e10.toFixed(3)}</Text></View>}
          </View>
        </GlassCard>
      ))}

      <Text style={s.source}>Source : Statbel/SPF Économie Belgique · Mis à jour quotidiennement</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: theme.colors.bgDeep },
  mockBadge:      { color: theme.colors.warning, fontSize: 11, fontWeight: '700', marginHorizontal: 16, marginTop: 12 },
  hero:           { margin: 16, borderRadius: theme.radius.xl, padding: 20, ...theme.shadow.glow },
  heroLabel:      { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  heroStation:    { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  heroPrice:      { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  heroAddr:       { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 8 },
  heroEcoWrap:    { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: theme.radius.sm, padding: 8, marginTop: 4 },
  heroEco:        { color: '#fff', fontSize: 12, fontWeight: '600' },
  tabs:           { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 8 },
  tab:            { flex: 1, backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.borderCyan },
  tabText:        { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  tabTextActive:  { color: theme.colors.cyan },
  sectionTitle:   { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card:           { marginHorizontal: 16, marginBottom: 10, padding: 16 },
  cardBest:       { borderColor: 'rgba(52,211,153,0.3)' },
  bestBadge:      { alignSelf: 'flex-start', backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  bestText:       { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  stName:         { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  stAddr:         { color: theme.colors.textSecondary, fontSize: 12 },
  stPrice:        { color: theme.colors.cyan, fontSize: 24, fontWeight: '900' },
  priceRow:       { flexDirection: 'row', gap: 8, marginTop: 12 },
  priceTag:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: theme.radius.sm, padding: 8, alignItems: 'center' },
  priceTagLabel:  { color: theme.colors.textMuted, fontSize: 10, fontWeight: '600' },
  priceTagVal:    { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 2 },
  source:         { color: theme.colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16, marginHorizontal: 16 },
});
