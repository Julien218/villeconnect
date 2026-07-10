// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Bannière statut commune non validée
// RGPD : aucune PII. Disclaimer obligatoire si liens non validés par commune.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';

// ─── Types ──────────────────────────────────────────────────
export type CityStatus =
  | 'unknown'
  | 'pending_validation'
  | 'public_links_available'
  | 'contacted'
  | 'interested'
  | 'verified'
  | 'rejected';

export interface ServiceLink {
  id: number;
  service_type: string;
  label: string;
  url: string;
  verified_by_commune: boolean;
  verification_status: string;
}

export interface CityStatusBannerProps {
  cityName: string;
  postalCode: string;
  status: CityStatus;
  citizenCount?: number;
  links?: ServiceLink[];
  disclaimer?: string | null;
  onInvite?: () => void;
  /** Afficher les liens publics même non validés */
  showPublicLinks?: boolean;
}

// ─── Labels / couleurs par statut ───────────────────────────
const STATUS_CONFIG: Record<
  CityStatus,
  { label: string; icon: any; color: string; bgAlpha: string }
> = {
  unknown:               { label: 'Commune non référencée',         icon: 'help-circle',     color: '#999',     bgAlpha: '#99999920' },
  pending_validation:    { label: 'Commune en cours de validation', icon: 'time-outline',    color: '#F59E0B',  bgAlpha: '#F59E0B20' },
  public_links_available:{ label: 'Liens publics disponibles',      icon: 'link',            color: '#00E5FF',  bgAlpha: '#00E5FF20' },
  contacted:             { label: 'Commune contactée',              icon: 'mail-outline',    color: '#60A5FA',  bgAlpha: '#60A5FA20' },
  interested:            { label: 'Commune intéressée',             icon: 'star-outline',    color: '#8B5CF6',  bgAlpha: '#8B5CF620' },
  verified:              { label: 'Commune vérifiée ✓',             icon: 'checkmark-circle', color: '#00BFA5', bgAlpha: '#00BFA520' },
  rejected:              { label: 'Commune non disponible',         icon: 'close-circle',    color: '#EF4444',  bgAlpha: '#EF444420' },
};

const SERVICE_ICONS: Record<string, any> = {
  website:      'globe-outline',
  eguichet:     'laptop-outline',
  news:         'newspaper-outline',
  agenda:       'calendar-outline',
  procedures:   'document-text-outline',
  waste:        'trash-outline',
  works:        'construct-outline',
  urban:        'business-outline',
  cpas:         'heart-outline',
  contact:      'call-outline',
  associations: 'people-outline',
  commerce:     'storefront-outline',
  other:        'link-outline',
};

// ─── Composant principal ─────────────────────────────────────
export function CityStatusBanner({
  cityName,
  postalCode,
  status,
  citizenCount = 0,
  links = [],
  disclaimer,
  onInvite,
  showPublicLinks = true,
}: CityStatusBannerProps) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_validation;
  const [linksOpen, setLinksOpen] = useState(false);

  const isFullyActive = status === 'verified';
  const isRejected = status === 'rejected';
  const hasLinks = links.length > 0;
  const showInvite = !isFullyActive && !isRejected;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 350 }}
      style={[s.container, { borderColor: cfg.color + '50', backgroundColor: cfg.bgAlpha }]}
    >
      {/* Header statut */}
      <View style={s.header}>
        <View style={[s.badge, { borderColor: cfg.color }]}>
          <Ionicons name={cfg.icon} size={13} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {citizenCount > 0 && !isFullyActive && (
          <Text style={s.countText}>{citizenCount} citoyen{citizenCount > 1 ? 's' : ''}</Text>
        )}
      </View>

      {/* Message contextuel */}
      {!isFullyActive && !isRejected && (
        <Text style={s.message}>
          VilleConnect OS prépare l'arrivée de{' '}
          <Text style={{ fontWeight: '700' }}>{cityName}</Text>.
          {citizenCount >= 5
            ? ` Déjà ${citizenCount} citoyens inscrits — la commune sera bientôt contactée.`
            : ' Invitez votre commune pour accélérer le processus.'}
        </Text>
      )}

      {isRejected && (
        <Text style={s.message}>
          {cityName} n'est pas encore disponible sur VilleConnect OS.
        </Text>
      )}

      {/* Liens publics disponibles */}
      {showPublicLinks && hasLinks && !isRejected && (
        <View style={s.linksSection}>
          <TouchableOpacity style={s.linksToggle} onPress={() => setLinksOpen(o => !o)}>
            <Ionicons name="globe-outline" size={15} color={theme.colors.cyan} />
            <Text style={s.linksToggleText}>
              Voir les services publics disponibles ({links.length})
            </Text>
            <Ionicons
              name={linksOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>

          {linksOpen && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
            >
              {/* Disclaimer obligatoire */}
              {disclaimer && (
                <View style={s.disclaimer}>
                  <Ionicons name="information-circle-outline" size={13} color="#F59E0B" />
                  <Text style={s.disclaimerText}>{disclaimer}</Text>
                </View>
              )}
              {links.map(link => (
                <TouchableOpacity
                  key={link.id}
                  style={s.linkRow}
                  onPress={() => Linking.openURL(link.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={SERVICE_ICONS[link.service_type] || SERVICE_ICONS.other}
                    size={16}
                    color={link.verified_by_commune ? theme.colors.cyan : theme.colors.textMuted}
                  />
                  <Text style={s.linkLabel}>{link.label}</Text>
                  {link.verified_by_commune && (
                    <View style={s.verifiedBadge}>
                      <Text style={s.verifiedText}>✓</Text>
                    </View>
                  )}
                  <Ionicons name="open-outline" size={13} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </MotiView>
          )}
        </View>
      )}

      {/* CTA : Inviter ma commune */}
      {showInvite && onInvite && (
        <TouchableOpacity style={s.cta} onPress={onInvite} activeOpacity={0.8}>
          <Ionicons name="megaphone-outline" size={15} color="#fff" />
          <Text style={s.ctaText}>Inviter ma commune</Text>
        </TouchableOpacity>
      )}
    </MotiView>
  );
}

// ─── Styles ─────────────────────────────────────────────────
function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: 14,
      marginHorizontal: 16,
      marginVertical: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 11.5,
      fontWeight: '700',
      fontFamily: theme.fonts.medium,
    },
    countText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.regular,
    },
    message: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 19,
      marginBottom: 10,
      fontFamily: theme.fonts.regular,
    },
    linksSection: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 10,
    },
    linksToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    linksToggleText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.cyan,
      fontWeight: '600',
      fontFamily: theme.fonts.medium,
    },
    disclaimer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      backgroundColor: '#F59E0B10',
      borderRadius: 6,
      padding: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    disclaimerText: {
      flex: 1,
      fontSize: 11,
      color: '#F59E0B',
      lineHeight: 16,
      fontFamily: theme.fonts.regular,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    linkLabel: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.regular,
    },
    verifiedBadge: {
      backgroundColor: '#00BFA520',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    verifiedText: {
      fontSize: 10,
      color: '#00BFA5',
      fontWeight: '700',
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: '#0047FF',
      borderRadius: theme.radius.md,
      paddingVertical: 10,
      marginTop: 12,
    },
    ctaText: {
      color: '#fff',
      fontSize: 13.5,
      fontWeight: '700',
      fontFamily: theme.fonts.bold,
    },
  });
}
