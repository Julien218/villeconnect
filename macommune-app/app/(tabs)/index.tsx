// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: '📅', label: 'Événements', route: '/(tabs)/events', color: '#3B82F6' },
  { icon: '🏪', label: 'Commerces',  route: '/(tabs)/shops',  color: '#10B981' },
  { icon: '⛽', label: 'Carburant',  route: '/(tabs)/fuel',   color: '#F59E0B' },
  { icon: '💎', label: 'Wallet',     route: '/(tabs)/wallet', color: '#7C3AED' },
  { icon: '🚨', label: 'Alertes',    route: '/(tabs)/index',  color: '#EF4444' },
  { icon: '🤝', label: 'Entraide',   route: '/(tabs)/index',  color: '#14B8A6' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [eventsCount, setEventsCount] = useState<number | null>(null);
  const [shopsCount, setShopsCount] = useState<number | null>(null);
  const [alertsCount, setAlertsCount] = useState<number | null>(null);
  const [latestAlert, setLatestAlert] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const [ev, sh, al, alList] = await Promise.all([
        trpcQuery<any>('events.stats', { postalCode: '7370' }),
        trpcQuery<any>('shops.stats', { postalCode: '7370' }),
        trpcQuery<any>('alerts.count', { postalCode: '7370' }),
        trpcQuery<any[]>('alerts.list', { postalCode: '7370', limit: 1 }),
      ]);
      if (ev.data) setEventsCount(Number(ev.data.approved) || 0);
      if (sh.data) setShopsCount(Number(sh.data.total) || 0);
      if (al.data) setAlertsCount(Number(al.data.total) || 0);
      if (alList.data && alList.data.length > 0) setLatestAlert(alList.data[0]);
    })();
  }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Hero card */}
      <View style={s.hero}>
        <View style={s.heroBadge}><Text style={s.heroBadgeText}>● DOUR · 7370</Text></View>
        <Text style={s.heroTitle}>Bonjour 👋</Text>
        <Text style={s.heroSub}>Votre commune en temps réel</Text>
        <View style={s.heroStats}>
          <View style={s.heroStat}><Text style={s.heroStatNum}>{eventsCount ?? '–'}</Text><Text style={s.heroStatLabel}>Événements</Text></View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{shopsCount ?? '–'}</Text><Text style={s.heroStatLabel}>Commerces</Text></View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{alertsCount ?? '–'}</Text><Text style={s.heroStatLabel}>Alertes</Text></View>
        </View>
      </View>

      {/* Actions rapides */}
      <Text style={s.sectionTitle}>Actions rapides</Text>
      <View style={s.grid}>
        {QUICK_ACTIONS.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={[s.actionCard, { borderColor: a.color + '33' }]}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.75}
          >
            <View style={[s.actionIcon, { backgroundColor: a.color + '22' }]}>
              <Text style={{ fontSize: 26 }}>{a.icon}</Text>
            </View>
            <Text style={s.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alerte communale */}
      <Text style={s.sectionTitle}>Dernière alerte</Text>
      {latestAlert ? (
        <View style={s.alertCard}>
          <View style={s.alertDot} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>{latestAlert.title}</Text>
            <Text style={s.alertDesc}>{latestAlert.message}</Text>
            <Text style={s.alertDate}>{new Date(latestAlert.createdAt).toLocaleDateString('fr-BE')} · Commune de Dour</Text>
          </View>
        </View>
      ) : (
        <View style={s.alertCard}>
          <Text style={s.alertDesc}>Aucune alerte active pour l'instant.</Text>
        </View>
      )}

      {/* Footer version */}
      <Text style={s.version}>Ma Commune v1.0 · VilleConnect OS™ · © 2026 Js-Innov.IA</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#0A0F1E' },
  hero:            { margin: 16, borderRadius: 20, backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', padding: 24 },
  heroBadge:       { alignSelf: 'flex-start', backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  heroBadgeText:   { color: '#10B981', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle:       { color: '#F9FAFB', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  heroSub:         { color: '#9CA3AF', fontSize: 14, marginBottom: 20 },
  heroStats:       { flexDirection: 'row', alignItems: 'center' },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatNum:     { color: '#10B981', fontSize: 22, fontWeight: '900' },
  heroStatLabel:   { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionTitle:    { color: '#F9FAFB', fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  actionCard:      { width: (width - 48) / 3, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 8 },
  actionIcon:      { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel:     { color: '#D1D5DB', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  alertCard:       { marginHorizontal: 16, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', padding: 16, flexDirection: 'row', gap: 12 },
  alertDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginTop: 5 },
  alertTitle:      { color: '#F9FAFB', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  alertDesc:       { color: '#9CA3AF', fontSize: 13, lineHeight: 18 },
  alertDate:       { color: '#6B7280', fontSize: 11, marginTop: 6 },
  version:         { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 32 },
});
