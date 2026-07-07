// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { trpcQuery, getOpenId } from '@/shared/api-client';
import { theme } from '@/shared/theme';
import { getBranding } from '@/shared/branding';
import { GlassCard } from '@/components/glass-card';

const { width } = Dimensions.get('window');
const brand = getBranding('7370');

const MODULES = [
  { key: 'actualites',  icon: 'newspaper',      label: 'Actualités',  route: '/(tabs)/events' },
  { key: 'agenda',      icon: 'calendar',       label: 'Agenda',      route: '/(tabs)/events' },
  { key: 'signalement', icon: 'warning',        label: 'Signalement', route: '/(tabs)/index' },
  { key: 'guichet',     icon: 'document-text',  label: 'E-guichet',   route: '/(tabs)/index' },
  { key: 'commerces',   icon: 'storefront',     label: 'Commerces',   route: '/(tabs)/shops' },
  { key: 'promotions',  icon: 'pricetag',       label: 'Promotions',  route: '/(tabs)/shops' },
  { key: 'carburant',   icon: 'flame',          label: 'Carburant',   route: '/(tabs)/fuel' },
  { key: 'entraide',    icon: 'people',         label: 'Entraide',    route: '/(tabs)/index' },
  { key: 'commune',     icon: 'location',       label: 'Ma commune',  route: '/(tabs)/index' },
  { key: 'plus',        icon: 'ellipsis-horizontal', label: 'Plus',   route: '/(tabs)/index' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [shopPromo, setShopPromo] = useState<any | null>(null);
  const [latestEvent, setLatestEvent] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const openId = await getOpenId();
      const [wallet, missionsRes, shops, events] = await Promise.all([
        trpcQuery<any>('wallet.getWallet', { openId, postalCode: brand.postalCode }),
        trpcQuery<any[]>('wallet.getMissions', { postalCode: brand.postalCode }),
        trpcQuery<any[]>('shops.list', { postalCode: brand.postalCode, limit: 50 }),
        trpcQuery<any[]>('events.list', { postalCode: brand.postalCode, limit: 5 }),
      ]);
      if (wallet.data) setBalance(wallet.data.available_balance ?? 0);
      if (missionsRes.data) setMissions(missionsRes.data.slice(0, 3));
      if (shops.data) {
        const promo = shops.data.find((s: any) => s.hasPromotion) || shops.data[0];
        if (promo) setShopPromo(promo);
      }
      if (events.data && events.data.length > 0) setLatestEvent(events.data[0]);
    })();
  }, []);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

      {/* ── Header ville ── */}
      <ImageBackground
        source={require('@/assets/city-skyline-header.png')}
        style={s.header}
        imageStyle={{ opacity: 0.55 }}
      >
        <LinearGradient
          colors={['rgba(6,11,24,0.4)', 'rgba(6,11,24,0.75)', theme.colors.bgDeep]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.headerTop}>
          <View style={s.brandRow}>
            <Image source={require('@/assets/logo-official.png')} style={s.logo} />
            <View>
              <Text style={s.brandName}>{brand.appName.toUpperCase()}</Text>
              <Text style={s.brandSub}>{brand.platformName}</Text>
            </View>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="notifications" size={18} color={theme.colors.textPrimary} />
              <View style={s.dot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="person" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.greetRow}>
          <View>
            <Text style={s.greet}>Bonjour 👋</Text>
            <Text style={s.greetSub}>Que souhaitez-vous faire aujourd'hui ?</Text>
          </View>
          <View style={s.weather}>
            <Ionicons name="partly-sunny" size={20} color={theme.colors.warning} />
            <Text style={s.weatherTemp}>16°</Text>
            <Text style={s.weatherLabel}>Nuageux</Text>
          </View>
        </View>
      </ImageBackground>

      {/* ── Wallet CivicLoop ── */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs)/wallet' as any)}>
        <LinearGradient
          colors={[theme.colors.navyGrad2, theme.colors.cyanGrad1, theme.colors.cyanGrad2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.walletCard}
        >
          <Text style={s.walletLabel}>SOLDE CIVICLOOP</Text>
          <View style={s.walletRow}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              <Text style={s.walletBalance}>{balance ?? '···'}</Text>
              <Text style={s.walletUnit}>CL</Text>
            </View>
            <View style={s.walletBadge}>
              <Text style={s.walletBadgeText}>CL</Text>
            </View>
          </View>
          {balance != null && <Text style={s.walletEuro}>= {(balance * 0.01).toFixed(2)} €</Text>}
          <View style={s.walletFooter}>
            <Text style={s.walletCta}>Voir mon wallet</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Grille modules ── */}
      <View style={s.grid}>
        {MODULES.map((m) => {
          const mod = (theme.colors.modules as any)[m.key];
          return (
            <TouchableOpacity key={m.key} style={s.moduleItem} activeOpacity={0.75} onPress={() => router.push(m.route as any)}>
              <View style={[s.moduleIcon, { backgroundColor: mod.bg }]}>
                <Ionicons name={m.icon as any} size={20} color={mod.fg} />
              </View>
              <Text style={s.moduleLabel}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Missions rapides ── */}
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>MISSIONS RAPIDES</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/wallet' as any)}>
          <Text style={s.sectionLink}>Voir tout ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.md, gap: 10 }}>
        {(missions.length > 0 ? missions : [{ id: 'x', title: 'Complétez votre profil', credits: 15, icon: '👋' }]).map((m: any, i: number) => (
          <GlassCard key={m.id ?? i} style={s.missionCard as any}>
            <Text style={{ fontSize: 22 }}>{m.icon || '🎯'}</Text>
            <Text style={s.missionTitle} numberOfLines={2}>{m.title}</Text>
            <Text style={s.missionPts}>+{m.credits ?? 10} CL</Text>
          </GlassCard>
        ))}
      </ScrollView>

      {/* ── Offres locales ── */}
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>OFFRES LOCALES</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/shops' as any)}>
          <Text style={s.sectionLink}>Voir tout ›</Text>
        </TouchableOpacity>
      </View>
      <GlassCard style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: 12 } as any}>
        <View style={s.offerIcon}><Ionicons name="storefront" size={22} color={theme.colors.cyan} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.offerTitle}>{shopPromo?.name || 'Découvrez les commerces locaux'}</Text>
          <Text style={s.offerSub}>{shopPromo?.category || brand.cityName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </GlassCard>

      {/* ── Actualités ── */}
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>ACTUALITÉS</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/events' as any)}>
          <Text style={s.sectionLink}>Voir tout ›</Text>
        </TouchableOpacity>
      </View>
      <GlassCard style={{ marginHorizontal: theme.spacing.md, padding: theme.spacing.md, gap: 4 } as any}>
        {latestEvent ? (
          <>
            <Text style={s.newsDate}>{new Date(latestEvent.dateStart).toLocaleDateString('fr-BE')}</Text>
            <Text style={s.newsTitle}>{latestEvent.title}</Text>
          </>
        ) : (
          <Text style={s.newsSub}>Pas d'actualité pour le moment.</Text>
        )}
      </GlassCard>

      <Text style={s.version}>{brand.appName} · {brand.platformName}™ · © 2026 Js-Innov.IA</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: theme.colors.bgDeep },

  header:      { height: 280, paddingTop: 54, paddingBottom: 52, paddingHorizontal: theme.spacing.md, justifyContent: 'space-between', overflow: 'hidden' },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo:        { width: 40, height: 40, resizeMode: 'contain' },
  brandName:   { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  brandSub:    { color: theme.colors.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  dot:         { position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.cyan },

  greetRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  greet:       { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '900' },
  greetSub:    { color: theme.colors.textSecondary, fontSize: 12.5, marginTop: 2, maxWidth: width * 0.62 },
  weather:     { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, gap: 1 },
  weatherTemp: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
  weatherLabel:{ color: theme.colors.textMuted, fontSize: 9 },

  walletCard:  { marginHorizontal: theme.spacing.md, marginTop: -28, borderRadius: theme.radius.xl, padding: theme.spacing.lg, ...theme.shadow.glow },
  walletLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  walletRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  walletBalance:{ color: '#fff', fontSize: 40, fontWeight: '900' },
  walletUnit:  { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  walletBadge: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  walletBadgeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  walletEuro:  { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  walletFooter:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  walletCta:   { color: '#fff', fontSize: 12.5, fontWeight: '700' },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.xl, rowGap: 18 },
  moduleItem:  { width: (width - theme.spacing.md * 2) / 5, alignItems: 'center', gap: 6 },
  moduleIcon:  { width: 46, height: 46, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: theme.spacing.md, marginTop: theme.spacing.xl, marginBottom: 10 },
  sectionTitle:{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  sectionLink: { color: theme.colors.cyan, fontSize: 12, fontWeight: '700' },

  missionCard: { width: 132, padding: 14, gap: 8, alignItems: 'flex-start' },
  missionTitle:{ color: theme.colors.textPrimary, fontSize: 12.5, fontWeight: '700', lineHeight: 16, minHeight: 32 },
  missionPts:  { color: theme.colors.success, fontSize: 12, fontWeight: '800' },

  offerIcon:   { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.cyanSoft, alignItems: 'center', justifyContent: 'center' },
  offerTitle:  { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  offerSub:    { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },

  newsDate:    { color: theme.colors.textMuted, fontSize: 10.5, fontWeight: '700' },
  newsTitle:   { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 },
  newsSub:     { color: theme.colors.textSecondary, fontSize: 13 },

  version:     { color: theme.colors.textMuted, fontSize: 10.5, textAlign: 'center', marginTop: 28 },
});
