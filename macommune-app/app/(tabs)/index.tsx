// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getOpenId, trpcQuery } from '@/shared/api-client';
import { darkTheme, ThemeTokens } from '@/shared/theme';
import { getBranding } from '@/shared/branding';
import { GlassCard } from '@/components/glass-card';
import { useAuth } from '@/shared/auth-context';
import { CityStatusBanner } from '@/components/CityStatusBanner';
import { useCityStatus } from '@/shared/useCityStatus';
import { NightHome } from '@/components/home/night-home';
import { ServiceLogo, type ServiceLogoName } from '@/components/home/service-logo';
import { NeonPulseButton } from '@/components/neon-pulse-button';

const BANNER_STATUSES = new Set([
  'unknown',
  'pending_validation',
  'public_links_available',
  'contacted',
  'interested',
]);

interface Mission {
  id: number | string;
  title: string;
  credits?: number;
  icon?: string;
}

interface Commerce {
  id: string;
  name: string;
  category: string;
  hasPromotion?: boolean | number;
  promotionText?: string | null;
}

interface LocalEvent {
  id: number | string;
  title: string;
  dateStart?: string;
  location?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const theme = darkTheme;
  const s = makeStyles(theme);

  const postalCode = user?.postalCode?.trim() || '7370';
  const brand = useMemo(() => getBranding(postalCode), [postalCode]);
  const cityDisplayName = user?.city?.trim() || brand.cityName;

  const [balance, setBalance] = useState<number | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [featuredCommerce, setFeaturedCommerce] = useState<Commerce | null>(null);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<LocalEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setDataError(null);

    const openId = await getOpenId();
    const [wallet, missionsResult, commerceResult, eventsResult] = await Promise.all([
      isLoggedIn
        ? trpcQuery<any>('wallet.getMyWallet', {}, { authenticated: true })
        : trpcQuery<any>('wallet.getWallet', { openId, postalCode }),
      trpcQuery<Mission[]>('wallet.getMissions', { postalCode }),
      trpcQuery<{ items: Commerce[] }>('commerce.listPublished', { postalCode, limit: 30 }),
      trpcQuery<LocalEvent[]>('events.list', { postalCode, limit: 5 }),
    ]);

    setBalance(wallet.data ? Number(wallet.data.available_balance ?? 0) : null);
    setMissions(missionsResult.data?.slice(0, 3) || []);

    const commerces = commerceResult.data?.items || [];
    setFeaturedCommerce(
      commerces.find(item => Boolean(item.hasPromotion)) || commerces[0] || null
    );
    setLatestEvent(eventsResult.data?.[0] || null);
    setLocalEvents(eventsResult.data || []);

    const failures = [wallet.error, missionsResult.error, commerceResult.error, eventsResult.error]
      .filter(Boolean);
    if (failures.length === 4) {
      setDataError('Les services VilleConnect sont momentanément indisponibles.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [isLoggedIn, postalCode]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const userPostalCode = isLoggedIn ? user?.postalCode || undefined : undefined;
  const {
    status: cityStatus,
    cityName,
    citizenCount,
    links,
    disclaimer,
    registerInterest,
    loading: cityLoading,
  } = useCityStatus(userPostalCode);

  const showCityBanner = Boolean(
    userPostalCode && !cityLoading && BANNER_STATUSES.has(cityStatus)
  );

  const modules: { key: ServiceLogoName; label: string; route: string }[] = [
    { key: 'events', label: 'Actualités', route: '/(tabs)/events' },
    { key: 'agenda', label: 'Agenda', route: '/(tabs)/events' },
    { key: 'shops', label: 'Commerces', route: '/(tabs)/shops' },
    { key: 'fuel', label: 'Carburant', route: '/(tabs)/fuel' },
    { key: 'wallet', label: 'CivicLoop', route: '/(tabs)/wallet' },
    { key: 'services', label: 'Services', route: '/services' },
    { key: 'profile', label: 'Mon profil', route: '/(tabs)/profile' },
    isLoggedIn
      ? { key: 'account', label: 'Mon compte', route: '/(tabs)/profile' }
      : { key: 'login', label: 'Connexion', route: '/login' },
  ];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboard(true)}
          tintColor={theme.colors.cyan}
        />
      }
    >
      <NightHome city={cityDisplayName} events={localEvents} />
      <Text style={s.localSpace}>VOTRE ESPACE {brand.appName.toUpperCase()}</Text>

      {dataError && (
        <TouchableOpacity
          style={s.errorBanner}
          onPress={() => loadDashboard()}
          accessibilityRole="button"
        >
          <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.warning} />
          <Text style={s.errorText}>{dataError} Touchez pour réessayer.</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(tabs)/wallet' as any)}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le Wallet CivicLoop"
      >
        <LinearGradient
          colors={[theme.colors.navyGrad2, theme.colors.cyanGrad1, theme.colors.cyanGrad2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.walletCard}
        >
          <View style={s.walletHeader}>
            <View>
              <Text style={s.walletLabel}>CARTE DE FIDÉLITÉ CIVICLOOP</Text>
              <Text style={s.walletHint}>Missions et récompenses locales</Text>
            </View>
            <Ionicons name="shield-checkmark" size={25} color="#FFFFFF" />
          </View>
          <View style={s.walletRow}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={s.walletBalance}>{balance ?? '—'}</Text>
                <Text style={s.walletUnit}>CL</Text>
              </>
            )}
          </View>
          <View style={s.walletFooter}>
            <Text style={s.walletCta}>Ouvrir mon Wallet</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionEyebrow}>SERVICES CONNECTÉS</Text>
          <Text style={s.sectionTitle}>Votre ville en un geste</Text>
        </View>
      </View>

      <View style={s.moduleGrid} testID="connected-services">
        {modules.map(module => (
          <NeonPulseButton
            key={module.key}
            style={s.moduleCard}
            activeOpacity={0.95}
            onPress={() => router.push(module.route as any)}
            accessibilityRole="button"
            accessibilityLabel={module.label}
          >
            <ServiceLogo name={module.key} />
            <Text style={s.moduleLabel}>{module.label}</Text>
            <View style={s.moduleLine} />
          </NeonPulseButton>
        ))}
      </View>

      {showCityBanner && (
        <View style={s.cityBannerWrap}>
          <CityStatusBanner
            cityName={cityName || `Commune ${userPostalCode}`}
            postalCode={userPostalCode || ''}
            status={cityStatus}
            citizenCount={citizenCount}
            links={links}
            disclaimer={disclaimer}
            showPublicLinks
            onInvite={registerInterest}
          />
        </View>
      )}

      <SectionHeader
        theme={theme}
        title="Missions CivicLoop"
        action="Voir le Wallet"
        onPress={() => router.push('/(tabs)/wallet' as any)}
      />
      {loading ? (
        <View style={s.inlineLoading}><ActivityIndicator color={theme.colors.cyan} /></View>
      ) : missions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.horizontalContent}
        >
          {missions.map(mission => (
            <GlassCard key={String(mission.id)} style={s.missionCard as any}>
              <View style={s.missionIcon}>
                <Ionicons name="flag-outline" size={20} color={theme.colors.cyan} />
              </View>
              <Text style={s.missionTitle} numberOfLines={2}>{mission.title}</Text>
              <Text style={s.missionPoints}>+{Number(mission.credits ?? 0)} CL</Text>
            </GlassCard>
          ))}
        </ScrollView>
      ) : (
        <EmptyCard
          theme={theme}
          icon="flag-outline"
          title="Aucune mission disponible"
          text="Les prochaines missions locales apparaîtront ici après publication."
        />
      )}

      <SectionHeader
        theme={theme}
        title="Commerce local"
        action="Voir l’annuaire"
        onPress={() => router.push('/(tabs)/shops' as any)}
      />
      {featuredCommerce ? (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/shops' as any)}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <GlassCard style={s.featureCard as any}>
            <View style={s.featureIcon}>
              <Ionicons name="storefront-outline" size={25} color={theme.colors.cyan} />
            </View>
            <View style={s.featureCopy}>
              <Text style={s.featureTitle}>{featuredCommerce.name}</Text>
              <Text style={s.featureSubtitle}>{featuredCommerce.category}</Text>
              {featuredCommerce.promotionText ? (
                <Text style={s.featurePromo} numberOfLines={2}>
                  {featuredCommerce.promotionText}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.cyan} />
          </GlassCard>
        </TouchableOpacity>
      ) : (
        <EmptyCard
          theme={theme}
          icon="storefront-outline"
          title="Annuaire en préparation"
          text="Aucun commerce modéré n’est encore publié pour cette zone."
        />
      )}

      <SectionHeader
        theme={theme}
        title="À l’agenda"
        action="Voir les événements"
        onPress={() => router.push('/(tabs)/events' as any)}
      />
      {latestEvent ? (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/events' as any)}
          activeOpacity={0.82}
          accessibilityRole="button"
        >
          <GlassCard style={s.featureCard as any}>
            <View style={s.featureIcon}>
              <Ionicons name="calendar-outline" size={25} color={theme.colors.cyan} />
            </View>
            <View style={s.featureCopy}>
              <Text style={s.featureTitle}>{latestEvent.title}</Text>
              <Text style={s.featureSubtitle}>
                {latestEvent.dateStart
                  ? new Date(latestEvent.dateStart).toLocaleDateString('fr-BE')
                  : 'Date à confirmer'}
                {latestEvent.location ? ` · ${latestEvent.location}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.cyan} />
          </GlassCard>
        </TouchableOpacity>
      ) : (
        <EmptyCard
          theme={theme}
          icon="calendar-outline"
          title="Aucun événement publié"
          text="Les événements validés par la plateforme apparaîtront ici."
        />
      )}

      <Text style={s.version}>
        {brand.appName} · {brand.platformName} · © 2026 Js-Innov.IA
      </Text>
    </ScrollView>
  );
}

function SectionHeader({
  theme,
  title,
  action,
  onPress,
}: {
  theme: ThemeTokens;
  title: string;
  action: string;
  onPress: () => void;
}) {
  const s = makeStyles(theme);
  return (
    <View style={s.listHeader}>
      <Text style={s.listTitle}>{title}</Text>
      <TouchableOpacity onPress={onPress} accessibilityRole="button">
        <Text style={s.listAction}>{action} ›</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyCard({
  theme,
  icon,
  title,
  text,
}: {
  theme: ThemeTokens;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  const s = makeStyles(theme);
  return (
    <GlassCard style={s.emptyCard as any}>
      <Ionicons name={icon} size={24} color={theme.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.emptyTitle}>{title}</Text>
        <Text style={s.emptyText}>{text}</Text>
      </View>
    </GlassCard>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, width: '100%', maxWidth: 473, alignSelf: 'center', backgroundColor: '#02070D' },
    localSpace: { color: '#8194AB', fontSize: 10, letterSpacing: 2, marginTop: 36, marginBottom: 18, textAlign: 'center' },
    content: { paddingBottom: 125 },
    errorBanner: {
      marginHorizontal: 16, marginTop: 0, marginBottom: 10,
      padding: 13, borderRadius: 14, flexDirection: 'row', gap: 9,
      borderWidth: 1, borderColor: theme.colors.warning + '55',
      backgroundColor: theme.colors.surfaceSolid,
    },
    errorText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },
    walletCard: {
      marginHorizontal: 16, marginTop: 0, borderRadius: 26,
      padding: 20, minHeight: 180, justifyContent: 'space-between',
      shadowColor: theme.colors.cyan, shadowOpacity: 0.25, shadowRadius: 22,
    },
    walletHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    walletLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    walletHint: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 5 },
    walletRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, minHeight: 58 },
    walletBalance: { color: '#FFFFFF', fontSize: 46, fontWeight: '900', lineHeight: 52 },
    walletUnit: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 7 },
    walletFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    walletCta: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    sectionHeader: { marginHorizontal: 17, marginTop: 28, marginBottom: 13 },
    sectionEyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 4 },
    moduleGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      marginHorizontal: 12,
    },
    moduleCard: {
      width: '25%', minHeight: 142, alignItems: 'center',
      justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 10, gap: 6,
    },
    moduleLabel: { color: theme.colors.textPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    moduleLine: { width: 18, height: 2, borderRadius: 2, backgroundColor: theme.colors.cyan },
    cityBannerWrap: { marginHorizontal: 16, marginTop: 20 },
    listHeader: {
      marginHorizontal: 17, marginTop: 28, marginBottom: 12,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    },
    listTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '900' },
    listAction: { color: theme.colors.cyan, fontSize: 11, fontWeight: '800' },
    inlineLoading: { paddingVertical: 28, alignItems: 'center' },
    horizontalContent: { paddingHorizontal: 16, gap: 10 },
    missionCard: { width: 168, minHeight: 132, padding: 15, gap: 9 },
    missionIcon: {
      width: 38, height: 38, borderRadius: 13,
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    missionTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800', lineHeight: 18 },
    missionPoints: { color: theme.colors.cyan, fontSize: 12, fontWeight: '900' },
    featureCard: {
      marginHorizontal: 16, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 13,
    },
    featureIcon: {
      width: 52, height: 52, borderRadius: 18,
      backgroundColor: theme.colors.cyanSoft,
      borderWidth: 1, borderColor: theme.colors.cyan + '44',
      alignItems: 'center', justifyContent: 'center',
    },
    featureCopy: { flex: 1 },
    featureTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '900' },
    featureSubtitle: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4, lineHeight: 16 },
    featurePromo: { color: theme.colors.warning, fontSize: 11, fontWeight: '700', marginTop: 5 },
    emptyCard: {
      marginHorizontal: 16, padding: 17,
      flexDirection: 'row', alignItems: 'center', gap: 13,
    },
    emptyTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    emptyText: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
    version: { color: theme.colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 34 },
  });
}
