// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Écran Services publics communaux
// Route : /services (stack screen, pas d'onglet)
// Source de données : city.getServiceLinks (tRPC, route publique — fonctionne invité + connecté)
// Ne touche pas : auth / wallet / thème / DB / flow token commune

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { getBranding } from '@/shared/branding';
import { useCityStatus } from '@/shared/useCityStatus';
import { groupServiceLinks, SERVICE_TYPE_ICON } from '@/shared/services-types';
import type { ServiceLink } from '@/components/CityStatusBanner';

// ─── Config branding (postal code Dour par défaut) ──────────
// L'écran utilise le code postal du branding actif.
// À remplacer par user.postalCode quand l'auth sera propagée ici.
const brand = getBranding('7370');
const POSTAL_CODE = brand.postalCode ?? '7370';

// ─── Statuts affichant un message "commune non connectée" ───
const UNCONNECTED_STATUSES = new Set([
  'unknown',
  'pending_validation',
  'contacted',
  'interested',
]);

// ─── Composant principal ─────────────────────────────────────
export default function ServicesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const {
    loading,
    error,
    status,
    cityName,
    links,
    disclaimer,
    refresh,
    registerInterest,
  } = useCityStatus(POSTAL_CODE);

  const groups = groupServiceLinks(links);
  const isVerified = status === 'verified';
  const isUnconnected = UNCONNECTED_STATUSES.has(status);
  const hasLinks = links.length > 0;

  // ─── Ouvrir un lien externe ───────────────────────────────
  const openLink = useCallback((url: string, label: string) => {
    if (!url || url.trim() === '') return;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Lien indisponible',
        `Le service "${label}" est momentanément inaccessible.\nVeuillez réessayer ultérieurement.`,
        [{ text: 'OK', style: 'default' }]
      );
    });
  }, []);

  // ─── Animation fade-in ───────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  return (
    <View style={s.screen}>
      <StatusBar barStyle={theme.statusBarStyle as any} />

      {/* ── Header ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[theme.colors.navyGrad1, theme.colors.navyGrad2]}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <Text style={s.headerCityName}>{cityName ?? brand.appName}</Text>
          <Text style={s.headerSubtitle}>Services publics</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={refresh} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Contenu ────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.colors.cyan}
            colors={[theme.colors.cyan]}
          />
        }
      >

        {/* État : chargement initial */}
        {loading && links.length === 0 && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={theme.colors.cyan} />
            <Text style={s.loadingText}>Chargement des services…</Text>
          </View>
        )}

        {/* État : erreur réseau */}
        {!loading && error && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={s.errorBox}
          >
            <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
            <Text style={s.errorTitle}>Services indisponibles</Text>
            <Text style={s.errorSub}>
              Impossible de charger les services de{' '}
              {cityName ?? 'votre commune'} pour le moment.
            </Text>
            <TouchableOpacity style={s.retryBtn} onPress={refresh} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={s.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </MotiView>
        )}

        {/* État : commune non connectée (aucun lien) */}
        {!loading && !error && isUnconnected && !hasLinks && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={s.emptyBox}
          >
            <Ionicons name="time-outline" size={44} color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={s.emptyTitle}>Commune en cours de validation</Text>
            <Text style={s.emptySub}>
              {cityName ?? 'Votre commune'} n'est pas encore partenaire de VilleConnect OS.
              {'\n\n'}
              Invitez-la pour accélérer le processus : dès que suffisamment de citoyens
              seront inscrits, nous la contacterons officiellement.
            </Text>
            <TouchableOpacity
              style={s.inviteBtn}
              onPress={registerInterest}
              activeOpacity={0.85}
            >
              <Ionicons name="megaphone-outline" size={16} color="#fff" />
              <Text style={s.inviteText}>Inviter ma commune</Text>
            </TouchableOpacity>
          </MotiView>
        )}

        {/* État : liens disponibles */}
        {!loading && !error && hasLinks && (
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* Disclaimer (uniquement si non-verified) */}
            {disclaimer && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={s.disclaimerBox}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#F59E0B"
                  style={{ marginTop: 1 }}
                />
                <Text style={s.disclaimerText}>{disclaimer}</Text>
              </MotiView>
            )}

            {/* Badge verified (aucun disclaimer, aucun banner) */}
            {isVerified && (
              <View style={s.verifiedBadgeRow}>
                <Ionicons name="checkmark-circle" size={15} color="#00BFA5" />
                <Text style={s.verifiedBadgeText}>
                  Services officiels validés par {cityName ?? 'la commune'}
                </Text>
              </View>
            )}

            {/* Groupes de services */}
            {groups.map((group, gi) => (
              <MotiView
                key={group.key}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 280, delay: gi * 60 }}
                style={s.group}
              >
                {/* Titre du groupe */}
                <View style={s.groupHeader}>
                  <Ionicons name={group.icon as any} size={16} color={theme.colors.teal} />
                  <Text style={s.groupLabel}>{group.label.toUpperCase()}</Text>
                </View>

                {/* Cartes liens */}
                <View style={s.groupCards}>
                  {group.links.map((link, li) => (
                    <ServiceCard
                      key={link.id}
                      link={link}
                      theme={theme}
                      isLast={li === group.links.length - 1}
                      onPress={() => openLink(link.url, link.label)}
                    />
                  ))}
                </View>
              </MotiView>
            ))}

            {/* Note de bas de page */}
            <Text style={s.footerNote}>
              {isVerified
                ? `${links.length} service${links.length > 1 ? 's' : ''} officiel${links.length > 1 ? 's' : ''} — ${cityName ?? 'commune'}`
                : `${links.length} service${links.length > 1 ? 's' : ''} public${links.length > 1 ? 's' : ''} disponible${links.length > 1 ? 's' : ''}`
              }
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Composant ServiceCard ───────────────────────────────────
interface ServiceCardProps {
  link: ServiceLink;
  theme: ThemeTokens;
  isLast: boolean;
  onPress: () => void;
}

function ServiceCard({ link, theme, isLast, onPress }: ServiceCardProps) {
  const s = makeStyles(theme);
  const icon = SERVICE_TYPE_ICON[link.service_type] ?? 'link-outline';
  const isDisabled = !link.url || link.url.trim() === '';

  return (
    <TouchableOpacity
      style={[
        s.card,
        !isLast && s.cardBorder,
        isDisabled && s.cardDisabled,
      ]}
      onPress={onPress}
      activeOpacity={isDisabled ? 1 : 0.7}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={link.label}
      accessibilityHint={isDisabled ? 'Service non disponible' : 'Ouvre dans le navigateur'}
    >
      {/* Icône */}
      <View style={[s.cardIcon, isDisabled && { opacity: 0.35 }]}>
        <Ionicons
          name={icon as any}
          size={20}
          color={link.verified_by_commune ? theme.colors.cyan : theme.colors.teal}
        />
      </View>

      {/* Texte */}
      <View style={s.cardText}>
        <Text
          style={[s.cardLabel, isDisabled && { opacity: 0.4 }]}
          numberOfLines={1}
        >
          {link.label}
        </Text>
        {link.verified_by_commune && (
          <Text style={s.cardVerifiedHint}>Validé par la commune ✓</Text>
        )}
      </View>

      {/* Chevron / badge */}
      {isDisabled ? (
        <Ionicons name="ban-outline" size={16} color={theme.colors.textMuted} style={{ opacity: 0.4 }} />
      ) : (
        <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────
function makeStyles(theme: ThemeTokens) {
  const HEADER_H = Platform.OS === 'ios' ? 100 : 80;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bgDeep,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingTop: Platform.OS === 'ios' ? 52 : 28,
      paddingBottom: 16,
      paddingHorizontal: 16,
      minHeight: HEADER_H,
      gap: 8,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      paddingLeft: 4,
    },
    headerCityName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.4,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.regular,
      marginTop: 1,
    },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 12,
      paddingBottom: 100,
    },

    // États loading / erreur / vide
    center: {
      alignItems: 'center',
      paddingTop: 80,
      gap: 16,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.regular,
    },

    errorBox: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 64,
      gap: 12,
    },
    errorTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bold,
    },
    errorSub: {
      fontSize: 13.5,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      fontFamily: theme.fonts.regular,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#0047FF',
      borderRadius: theme.radius.md,
      paddingHorizontal: 24,
      paddingVertical: 11,
      marginTop: 8,
    },
    retryText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.fonts.bold,
    },

    emptyBox: {
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingTop: 60,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bold,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 13.5,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 21,
      fontFamily: theme.fonts.regular,
      marginTop: 4,
    },
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#0047FF',
      borderRadius: theme.radius.md,
      paddingHorizontal: 28,
      paddingVertical: 11,
      marginTop: 20,
    },
    inviteText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.fonts.bold,
    },

    // Disclaimer
    disclaimerBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: '#F59E0B12',
      borderWidth: 1,
      borderColor: '#F59E0B30',
      borderRadius: theme.radius.md,
      padding: 12,
    },
    disclaimerText: {
      flex: 1,
      fontSize: 12,
      color: '#F59E0B',
      lineHeight: 18,
      fontFamily: theme.fonts.regular,
    },

    // Badge verified
    verifiedBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    verifiedBadgeText: {
      fontSize: 12,
      color: '#00BFA5',
      fontFamily: theme.fonts.medium,
      fontWeight: '600',
    },

    // Groupes
    group: {
      marginHorizontal: 16,
      marginBottom: 20,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 8,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.teal,
      letterSpacing: 1.1,
      fontFamily: theme.fonts.bold,
    },

    // Cards groupe
    groupCards: {
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSolid,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 12,
      backgroundColor: 'transparent',
    },
    cardBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    cardDisabled: {
      opacity: 0.5,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: {
      flex: 1,
    },
    cardLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.medium,
    },
    cardVerifiedHint: {
      fontSize: 11,
      color: '#00BFA5',
      fontFamily: theme.fonts.regular,
      marginTop: 2,
    },

    // Pied de page
    footerNote: {
      textAlign: 'center',
      fontSize: 11.5,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.regular,
      marginTop: 4,
      marginBottom: 16,
    },
  });
}
