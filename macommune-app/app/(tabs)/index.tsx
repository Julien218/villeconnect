// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { getBranding } from '@/shared/branding';
import { GlassCard } from '@/components/glass-card';
import { useAuth } from '@/shared/auth-context';
import { CityStatusBanner } from '@/components/CityStatusBanner';
import { HexHub } from '@/components/home/hex-hub';
import { useCityStatus } from '@/shared/useCityStatus';

const BANNER_STATUSES = new Set([
  'unknown',
  'pending_validation',
  'public_links_available',
  'contacted',
  'interested',
]);

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
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const postalCode = user?.postalCode?.trim() || '7370';
  const brand = useMemo(() => getBranding(postalCode), [postalCode]);
  const cityDisplayName = user?.city?.trim() || brand.cityName;

  const [featuredCommerce, setFeaturedCommerce] = useState<Commerce | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<LocalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setDataError(null);

    const [commerceResult, eventsResult] = await Promise.all([
      trpcQuery<{ items: Commerce[] }>('commerce.listPublished', { postalCode, limit: 30 }),
      trpcQuery<LocalEvent[]>('events.list', { postalCode, limit: 5 }),
    ]);

    const commerces = commerceResult.data?.items || [];
    setFeaturedCommerce(
      commerces.find(item => Boolean(item.hasPromotion)) || commerces[0] || null
    );
    setUpcomingEvents((eventsResult.data || []).slice(0, 3));

    const failures = [commerceResult.error, eventsResult.error].filter(Boolean);
    if (failures.length === 2) {
      setDataError('Les services VilleConnect sont momentanément indisponibles.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [postalCode]);

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

  // Six modules réels (colonne gauche, puis colonne droite), comme sur la maquette.
  const hubItems = [
    { key: 'events', label: 'Actualités', icon: 'newspaper-outline', route: '/(tabs)/events' },
    { key: 'shops', label: 'Annuaire', icon: 'storefront-outline', route: '/(tabs)/shops' },
    { key: 'sport', label: 'Sport', icon: 'trophy-outline', route: '/sport' },
    { key: 'agenda', label: 'Agenda', icon: 'calendar-outline', route: '/(tabs)/events' },
    { key: 'services', label: 'Services', icon: 'grid-outline', route: '/services' },
    { key: 'fuel', label: 'Carburant', icon: 'car-sport-outline', route: '/(tabs)/fuel' },
  ] as const;

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
      <ImageBackground
        source={require('@/assets/city-skyline-header.png')}
        style={s.hero}
        imageStyle={s.heroImage}
      >
        <LinearGradient
          colors={['rgba(3,8,23,0.18)', 'rgba(3,8,23,0.72)', theme.colors.bgDeep]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.heroTop}>
          <View>
            <Text style={s.hello}>Bonjour</Text>
            <Text style={s.cityName}>{cityDisplayName}</Text>
            <Text style={s.cityTagline}>Votre ville, connectée au quotidien.</Text>
          </View>
          <TouchableOpacity
            style={s.profileButton}
            onPress={() => router.push(isLoggedIn ? '/(tabs)/profile' as any : '/login' as any)}
            accessibilityRole="button"
            accessibilityLabel={isLoggedIn ? 'Ouvrir mon profil' : 'Se connecter'}
          >
            <Ionicons
              name={isLoggedIn ? 'person' : 'log-in-outline'}
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={s.heroBrand}>
          <View style={s.logoHalo}>
            <Image source={require('@/assets/logo-official-small.png')} style={s.logo} />
          </View>
          <View style={s.heroBrandCopy}>
            <Text style={s.platformName}>VILLECONNECT OS</Text>
            <Text style={s.platformStatus}>Plateforme locale active · {postalCode}</Text>
          </View>
        </View>
      </ImageBackground>

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

      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionEyebrow}>SERVICES CONNECTÉS</Text>
          <Text style={s.sectionTitle}>Votre ville en un geste</Text>
        </View>
      </View>

      <HexHub items={hubItems} onPress={route => router.push(route as any)} />

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
        title="Événements à venir"
        action="Voir tout"
        onPress={() => router.push('/(tabs)/events' as any)}
      />
      {upcomingEvents.length > 0 ? (
        <View style={s.eventStrip}>
          {upcomingEvents.map(event => (
            <TouchableOpacity
              key={String(event.id)}
              style={s.eventTile}
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/events' as any)}
              accessibilityRole="button"
              accessibilityLabel={event.title}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.cyan} />
              <Text style={s.eventTileTitle} numberOfLines={2}>{event.title}</Text>
              <Text style={s.eventTileMeta} numberOfLines={1}>
                {event.dateStart ? new Date(event.dateStart).toLocaleDateString('fr-BE') : 'Date à confirmer'}
              </Text>
              {event.location ? <Text style={s.eventTileMeta} numberOfLines={1}>{event.location}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
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
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { paddingBottom: 125 },
    hero: {
      height: 330,
      paddingTop: 56,
      paddingHorizontal: 20,
      justifyContent: 'space-between',
      paddingBottom: 58,
      overflow: 'hidden',
    },
    heroImage: { opacity: 0.62 },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    hello: { color: theme.colors.cyan, fontSize: 15, fontWeight: '600' },
    // Le haut du bandeau est toujours sur la photo assombrie : texte clair quel que soit le thème.
    cityName: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', marginTop: 2 },
    cityTagline: { color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 23, marginTop: 5 },
    profileButton: {
      width: 48, height: 48, borderRadius: 24,
      borderWidth: 1, borderColor: theme.colors.cyan + '55',
      backgroundColor: 'rgba(3,8,23,0.62)',
      alignItems: 'center', justifyContent: 'center',
    },
    heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    logoHalo: {
      width: 66, height: 66, borderRadius: 33,
      borderWidth: 1, borderColor: theme.colors.cyan + '88',
      backgroundColor: 'rgba(0,96,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: theme.colors.cyan, shadowOpacity: 0.45, shadowRadius: 18,
    },
    logo: { width: 52, height: 52, resizeMode: 'contain' },
    heroBrandCopy: { flex: 1 },
    platformName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
    platformStatus: { color: theme.colors.cyan, fontSize: 11, marginTop: 4 },
    errorBanner: {
      marginHorizontal: 16, marginTop: -24, marginBottom: 10,
      padding: 13, borderRadius: 14, flexDirection: 'row', gap: 9,
      borderWidth: 1, borderColor: theme.colors.warning + '55',
      backgroundColor: theme.colors.surfaceSolid,
    },
    errorText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },
    sectionHeader: { marginHorizontal: 17, marginTop: 28, marginBottom: 13 },
    sectionEyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 4 },
    moduleGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      marginHorizontal: 12,
    },
    moduleCard: {
      width: '25%', minHeight: 112, alignItems: 'center',
      justifyContent: 'center', paddingHorizontal: 4, gap: 8,
    },
    moduleIcon: {
      width: 58, height: 58, borderRadius: 19,
      borderWidth: 1, borderColor: theme.colors.cyan + '55',
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    moduleIconAlt: { borderRadius: 29, backgroundColor: theme.colors.surfaceSolid },
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
    eventStrip: { flexDirection: 'row', gap: 10 },
    eventTile: {
      flex: 1, minHeight: 112, padding: 12, gap: 6, borderRadius: theme.radius.md,
      borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSolid,
    },
    eventTileTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    eventTileMeta: { color: theme.colors.textSecondary, fontSize: 11 },
    version: { color: theme.colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 34 },
  });
}
