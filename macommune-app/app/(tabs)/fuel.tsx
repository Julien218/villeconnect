// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

interface FuelStation {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city?: string | null;
  priceE10?: number | null;
  priceE5?: number | null;
  priceDiesel?: number | null;
  sourceName: string;
  sourceUrl?: string | null;
  sourceUpdatedAt: string;
}

type FuelType = 'DIESEL' | 'E5' | 'E10';
type DataStatus = 'available' | 'empty' | 'unavailable';

const TYPES: Array<{ key: FuelType; label: string }> = [
  { key: 'DIESEL', label: 'Diesel' },
  { key: 'E5', label: 'Essence 95' },
  { key: 'E10', label: 'E10' },
];

function priceFor(station: FuelStation, type: FuelType) {
  if (type === 'DIESEL') return station.priceDiesel;
  if (type === 'E5') return station.priceE5;
  return station.priceE10;
}

function formatPrice(value?: number | null) {
  return value == null ? '—' : `${value.toFixed(3)} €`;
}

export default function FuelScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode?.trim() || '7370';

  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<FuelType>('DIESEL');
  const [status, setStatus] = useState<DataStatus>('empty');
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const { data, error: apiError } = await trpcQuery<{
      items: FuelStation[];
      status: DataStatus;
      sourceUpdatedAt: string | null;
    }>('fuel.getStations', { postalCode, fuelType: selected, limit: 20 });

    if (apiError || !data) {
      setStations([]);
      setStatus('unavailable');
      setSourceUpdatedAt(null);
      setError(apiError || 'Le service carburant ne répond pas.');
    } else {
      setStations(data.items || []);
      setStatus(data.status);
      setSourceUpdatedAt(data.sourceUpdatedAt);
    }

    setLoading(false);
    setRefreshing(false);
  }, [postalCode, selected]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => (
    [...stations].sort((a, b) => (priceFor(a, selected) ?? 999) - (priceFor(b, selected) ?? 999))
  ), [stations, selected]);

  const best = sorted[0] || null;
  const bestPrice = best ? priceFor(best, selected) : null;
  const highestPrice = sorted.length > 1 ? priceFor(sorted[sorted.length - 1], selected) : null;
  const estimatedSaving = bestPrice != null && highestPrice != null
    ? Math.max(0, (highestPrice - bestPrice) * 50)
    : null;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={theme.colors.cyan}
        />
      }
    >
      <LinearGradient
        colors={[theme.colors.surfaceSolid, theme.colors.bgDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerIcon}>
          <Ionicons name="car-sport-outline" size={28} color={theme.colors.cyan} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>FUEL SAVER</Text>
          <Text style={s.title}>Prix carburant vérifiés</Text>
          <Text style={s.subtitle}>Zone {postalCode} · données horodatées uniquement</Text>
        </View>
      </LinearGradient>

      <View style={s.tabs}>
        {TYPES.map(type => (
          <TouchableOpacity
            key={type.key}
            style={[s.tab, selected === type.key && s.tabActive]}
            onPress={() => setSelected(type.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === type.key }}
          >
            <Text style={[s.tabText, selected === type.key && s.tabTextActive]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={s.stateBox}>
          <ActivityIndicator color={theme.colors.cyan} size="large" />
          <Text style={s.stateText}>Chargement des prix disponibles…</Text>
        </View>
      )}

      {!loading && (status === 'unavailable' || error) && (
        <GlassCard style={s.stateCard as any}>
          <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.warning} />
          <Text style={s.stateTitle}>Service temporairement indisponible</Text>
          <Text style={s.stateText}>{error || 'Les données carburant ne sont pas accessibles.'}</Text>
          <TouchableOpacity style={s.retry} onPress={() => load()} accessibilityRole="button">
            <Ionicons name="refresh" size={16} color={theme.colors.bgDeep} />
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {!loading && status === 'empty' && !error && (
        <GlassCard style={s.stateCard as any}>
          <Ionicons name="information-circle-outline" size={36} color={theme.colors.cyan} />
          <Text style={s.stateTitle}>Aucun prix publié</Text>
          <Text style={s.stateText}>
            Aucune station disposant d’un prix traçable pour {postalCode} n’est encore disponible.
          </Text>
        </GlassCard>
      )}

      {!loading && status === 'available' && best && bestPrice != null && (
        <>
          <LinearGradient
            colors={[theme.colors.navyGrad2, theme.colors.cyanGrad1, theme.colors.cyanGrad2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroTop}>
              <Text style={s.heroLabel}>MEILLEUR PRIX DISPONIBLE</Text>
              <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            </View>
            <Text style={s.heroStation}>{best.name}</Text>
            <Text style={s.heroPrice}>{bestPrice.toFixed(3)} €/L</Text>
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,.78)" />
              <Text style={s.heroAddress}>{best.address}</Text>
            </View>
            {estimatedSaving != null && estimatedSaving > 0 && (
              <View style={s.savingBox}>
                <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                <Text style={s.savingText}>
                  Écart estimé : {estimatedSaving.toFixed(2)} € sur 50 L
                </Text>
              </View>
            )}
          </LinearGradient>

          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>STATIONS DISPONIBLES</Text>
            <Text style={s.sectionCount}>{sorted.length}</Text>
          </View>

          {sorted.map((station, index) => {
            const selectedPrice = priceFor(station, selected);
            return (
              <GlassCard key={station.id} style={[s.card, index === 0 && s.cardBest] as any}>
                <View style={s.rank}>
                  <Text style={s.rankText}>{index + 1}</Text>
                </View>
                <View style={s.stationBody}>
                  <View style={s.stationTitleRow}>
                    <Text style={s.stationName} numberOfLines={1}>{station.name}</Text>
                    {index === 0 && (
                      <View style={s.bestBadge}><Text style={s.bestBadgeText}>MEILLEUR</Text></View>
                    )}
                  </View>
                  <Text style={s.stationAddress} numberOfLines={2}>{station.address}</Text>
                  <View style={s.sourceRow}>
                    <Ionicons name="document-text-outline" size={12} color={theme.colors.textMuted} />
                    <Text style={s.sourceText} numberOfLines={1}>Source : {station.sourceName}</Text>
                  </View>
                  <View style={s.priceGrid}>
                    <PriceCell theme={theme} label="Diesel" value={station.priceDiesel} />
                    <PriceCell theme={theme} label="E5" value={station.priceE5} />
                    <PriceCell theme={theme} label="E10" value={station.priceE10} />
                  </View>
                </View>
                <Text style={[s.selectedPrice, index === 0 && s.selectedPriceBest]}>
                  {formatPrice(selectedPrice)}
                </Text>
              </GlassCard>
            );
          })}

          <Text style={s.freshness}>
            {sourceUpdatedAt
              ? `Dernière donnée reçue : ${new Date(sourceUpdatedAt).toLocaleString('fr-BE')}`
              : 'Horodatage de source indisponible'}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function PriceCell({ theme, label, value }: { theme: ThemeTokens; label: string; value?: number | null }) {
  const s = makeStyles(theme);
  return (
    <View style={s.priceCell}>
      <Text style={s.priceLabel}>{label}</Text>
      <Text style={s.priceValue}>{value == null ? '—' : value.toFixed(3)}</Text>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { paddingBottom: 120, paddingTop: 10 },
    header: {
      marginHorizontal: 16, marginBottom: 14, padding: 20,
      borderRadius: 25, borderWidth: 1, borderColor: theme.colors.cyan + '55',
      flexDirection: 'row', alignItems: 'center', gap: 15,
    },
    headerIcon: {
      width: 58, height: 58, borderRadius: 20,
      borderWidth: 1, borderColor: theme.colors.cyan + '66',
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    title: { color: theme.colors.textPrimary, fontSize: 21, fontWeight: '900', marginTop: 3 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 5 },
    tabs: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 14 },
    tab: {
      flex: 1, paddingVertical: 11, alignItems: 'center',
      borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSolid,
    },
    tabActive: { borderColor: theme.colors.cyan, backgroundColor: theme.colors.cyanSoft },
    tabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    tabTextActive: { color: theme.colors.cyan },
    stateBox: { alignItems: 'center', gap: 12, paddingVertical: 44 },
    stateCard: { marginHorizontal: 16, padding: 28, alignItems: 'center', gap: 10 },
    stateTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'center' },
    stateText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 19, textAlign: 'center' },
    retry: {
      marginTop: 7, flexDirection: 'row', gap: 7, alignItems: 'center',
      backgroundColor: theme.colors.cyan, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    },
    retryText: { color: theme.colors.bgDeep, fontWeight: '900', fontSize: 12 },
    hero: { marginHorizontal: 16, borderRadius: 25, padding: 20, minHeight: 190, justifyContent: 'space-between' },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroLabel: { color: 'rgba(255,255,255,.78)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    heroStation: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 12 },
    heroPrice: { color: '#FFFFFF', fontSize: 39, fontWeight: '900', marginTop: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4 },
    heroAddress: { color: 'rgba(255,255,255,.78)', fontSize: 11, lineHeight: 16, flex: 1 },
    savingBox: {
      marginTop: 12, padding: 10, borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,.14)',
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    savingText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    sectionHeader: {
      marginHorizontal: 17, marginTop: 25, marginBottom: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sectionTitle: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    sectionCount: { color: theme.colors.cyan, fontSize: 12, fontWeight: '900' },
    card: {
      marginHorizontal: 16, marginBottom: 10, padding: 15,
      flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    },
    cardBest: { borderColor: theme.colors.success + '66' },
    rank: {
      width: 30, height: 30, borderRadius: 10,
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    rankText: { color: theme.colors.cyan, fontSize: 12, fontWeight: '900' },
    stationBody: { flex: 1 },
    stationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    stationName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '900', flexShrink: 1 },
    bestBadge: { borderRadius: 6, backgroundColor: theme.colors.success + '22', paddingHorizontal: 6, paddingVertical: 2 },
    bestBadgeText: { color: theme.colors.success, fontSize: 8, fontWeight: '900' },
    stationAddress: { color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    sourceText: { color: theme.colors.textMuted, fontSize: 9, flex: 1 },
    selectedPrice: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '900', marginLeft: 4 },
    selectedPriceBest: { color: theme.colors.success },
    priceGrid: { flexDirection: 'row', gap: 6, marginTop: 10 },
    priceCell: {
      flex: 1, borderRadius: 9, paddingVertical: 7,
      backgroundColor: theme.colors.surfaceSolid, alignItems: 'center',
    },
    priceLabel: { color: theme.colors.textMuted, fontSize: 8, fontWeight: '700' },
    priceValue: { color: theme.colors.textPrimary, fontSize: 10, fontWeight: '900', marginTop: 2 },
    freshness: { color: theme.colors.textMuted, fontSize: 10, textAlign: 'center', margin: 20 },
  });
}
