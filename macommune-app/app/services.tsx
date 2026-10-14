// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { getBranding } from '@/shared/branding';
import { useCityStatus } from '@/shared/useCityStatus';
import { groupServiceLinks, SERVICE_TYPE_ICON } from '@/shared/services-types';
import type { ServiceLink } from '@/components/CityStatusBanner';

const UNCONNECTED_STATUSES = new Set([
  'unknown',
  'pending_validation',
  'contacted',
  'interested',
]);

function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');
  } catch {
    return false;
  }
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const postalCode = user?.postalCode?.trim() || '7370';
  const brand = useMemo(() => getBranding(postalCode), [postalCode]);
  const {
    loading,
    error,
    status,
    cityName,
    links,
    disclaimer,
    refresh,
    registerInterest,
  } = useCityStatus(postalCode);

  const groups = useMemo(() => groupServiceLinks(links), [links]);
  const isVerified = status === 'verified';
  const isUnconnected = UNCONNECTED_STATUSES.has(status);
  const hasLinks = links.length > 0;

  const openLink = useCallback(async (url: string, label: string) => {
    if (!isSafePublicUrl(url)) {
      Alert.alert('Lien non valide', `Le lien du service « ${label} » n’est pas utilisable.`);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Lien indisponible',
        `Le service « ${label} » est momentanément inaccessible. Réessayez ultérieurement.`
      );
    }
  }, []);

  return (
    <View style={s.screen}>
      <StatusBar barStyle={theme.statusBarStyle as any} />
      <LinearGradient
        colors={[theme.colors.navyGrad1, theme.colors.navyGrad2]}
        style={s.header}
      >
        <TouchableOpacity
          style={s.circleButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Revenir à l’écran précédent"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCopy}>
          <Text style={s.eyebrow}>SERVICES PUBLICS</Text>
          <Text style={s.headerTitle}>{cityName || brand.cityName}</Text>
          <Text style={s.headerSubtitle}>Code postal {postalCode}</Text>
        </View>
        <TouchableOpacity
          style={s.circleButton}
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Actualiser les services"
        >
          <Ionicons name="refresh-outline" size={20} color={theme.colors.cyan} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && hasLinks}
            onRefresh={refresh}
            tintColor={theme.colors.cyan}
          />
        }
      >
        {loading && !hasLinks && (
          <View style={s.stateBox}>
            <ActivityIndicator size="large" color={theme.colors.cyan} />
            <Text style={s.stateText}>Chargement des services officiels…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={s.stateCard}>
            <View style={s.stateIcon}>
              <Ionicons name="cloud-offline-outline" size={30} color={theme.colors.warning} />
            </View>
            <Text style={s.stateTitle}>Services indisponibles</Text>
            <Text style={s.stateText}>
              Impossible de charger les services de {cityName || brand.cityName}.
            </Text>
            <TouchableOpacity style={s.primaryButton} onPress={refresh} accessibilityRole="button">
              <Ionicons name="refresh" size={16} color={theme.colors.bgDeep} />
              <Text style={s.primaryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && isUnconnected && !hasLinks && (
          <View style={s.stateCard}>
            <View style={s.stateIcon}>
              <Ionicons name="time-outline" size={30} color={theme.colors.warning} />
            </View>
            <Text style={s.stateTitle}>Commune en cours de validation</Text>
            <Text style={s.stateText}>
              {cityName || brand.cityName} n’est pas encore partenaire officiel de VilleConnect OS.
              Aucun lien n’est présenté comme officiel avant validation.
            </Text>
            <TouchableOpacity
              style={s.primaryButton}
              onPress={registerInterest}
              accessibilityRole="button"
            >
              <Ionicons name="megaphone-outline" size={16} color={theme.colors.bgDeep} />
              <Text style={s.primaryButtonText}>Inviter ma commune</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && hasLinks && (
          <>
            {disclaimer ? (
              <View style={s.disclaimer}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} />
                <Text style={s.disclaimerText}>{disclaimer}</Text>
              </View>
            ) : null}

            {isVerified ? (
              <View style={s.verifiedBanner}>
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
                <Text style={s.verifiedText}>
                  Services validés par {cityName || 'la commune'}
                </Text>
              </View>
            ) : null}

            {groups.map(group => (
              <View key={group.key} style={s.group}>
                <View style={s.groupHeader}>
                  <View style={s.groupIcon}>
                    <Ionicons name={group.icon as any} size={18} color={theme.colors.cyan} />
                  </View>
                  <Text style={s.groupTitle}>{group.label}</Text>
                  <Text style={s.groupCount}>{group.links.length}</Text>
                </View>

                <View style={s.linksCard}>
                  {group.links.map((link, index) => (
                    <ServiceRow
                      key={link.id}
                      link={link}
                      theme={theme}
                      last={index === group.links.length - 1}
                      onPress={() => openLink(link.url, link.label)}
                    />
                  ))}
                </View>
              </View>
            ))}

            <Text style={s.footerNote}>
              {links.length} service{links.length > 1 ? 's' : ''} affiché{links.length > 1 ? 's' : ''} · dernière vérification à l’ouverture
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ServiceRow({
  link,
  theme,
  last,
  onPress,
}: {
  link: ServiceLink;
  theme: ThemeTokens;
  last: boolean;
  onPress: () => void;
}) {
  const s = makeStyles(theme);
  const safe = isSafePublicUrl(link.url || '');
  const icon = SERVICE_TYPE_ICON[link.service_type] || 'link-outline';

  return (
    <TouchableOpacity
      style={[s.serviceRow, !last && s.serviceBorder, !safe && s.disabled]}
      onPress={onPress}
      disabled={!safe}
      accessibilityRole="link"
      accessibilityLabel={link.label}
      accessibilityHint={safe ? 'Ouvre le site du service' : 'Lien indisponible'}
    >
      <View style={s.serviceIcon}>
        <Ionicons
          name={icon as any}
          size={20}
          color={link.verified_by_commune ? theme.colors.cyan : theme.colors.teal}
        />
      </View>
      <View style={s.serviceCopy}>
        <Text style={s.serviceLabel}>{link.label}</Text>
        <Text style={s.serviceStatus}>
          {link.verified_by_commune ? 'Validé par la commune' : 'Lien public en attente de validation communale'}
        </Text>
      </View>
      <Ionicons
        name={safe ? 'open-outline' : 'ban-outline'}
        size={17}
        color={theme.colors.textMuted}
      />
    </TouchableOpacity>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    header: {
      paddingTop: 52,
      paddingBottom: 18,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    circleButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '44',
      backgroundColor: theme.colors.surfaceSolid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: { flex: 1 },
    eyebrow: { color: theme.colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
    headerTitle: { color: theme.colors.textPrimary, fontSize: 21, fontWeight: '900', marginTop: 2 },
    headerSubtitle: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
    scroll: { flex: 1 },
    content: { paddingTop: 14, paddingBottom: 100 },
    stateBox: { paddingTop: 80, alignItems: 'center', gap: 14 },
    stateCard: {
      marginHorizontal: 16,
      marginTop: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSolid,
      borderRadius: 24,
      padding: 26,
      alignItems: 'center',
      gap: 10,
    },
    stateIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'center' },
    stateText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 19, textAlign: 'center' },
    primaryButton: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.colors.cyan,
      borderRadius: 12,
      paddingHorizontal: 17,
      paddingVertical: 11,
    },
    primaryButtonText: { color: theme.colors.bgDeep, fontSize: 12, fontWeight: '900' },
    disclaimer: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.warning + '44',
      backgroundColor: theme.colors.warning + '10',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    disclaimerText: { color: theme.colors.textSecondary, fontSize: 11, lineHeight: 17, flex: 1 },
    verifiedBanner: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.success + '44',
      backgroundColor: theme.colors.success + '10',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    verifiedText: { color: theme.colors.success, fontSize: 11, fontWeight: '800', flex: 1 },
    group: { marginHorizontal: 16, marginBottom: 18 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
    groupIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '900', flex: 1 },
    groupCount: { color: theme.colors.cyan, fontSize: 11, fontWeight: '900' },
    linksCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSolid,
      borderRadius: 19,
      overflow: 'hidden',
    },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
    serviceBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    disabled: { opacity: 0.45 },
    serviceIcon: {
      width: 41,
      height: 41,
      borderRadius: 14,
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceCopy: { flex: 1 },
    serviceLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    serviceStatus: { color: theme.colors.textMuted, fontSize: 9, lineHeight: 13, marginTop: 3 },
    footerNote: { color: theme.colors.textMuted, fontSize: 9, textAlign: 'center', marginHorizontal: 20 },
  });
}
