// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { NeonPressable as Pressable } from '@/components/neon-button';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DOWNLOAD_LINKS, IOS_AVAILABLE } from '@/shared/download-links';

// ─── Palette VilleConnect OS ────────────────────────────────────────────────
const NAVY = '#0A0F1E';
const NAVY2 = '#111827';
const CYAN = '#06B6D4';
const BLUE = '#3B82F6';
const GREEN = '#10B981';
const TEXT = '#F9FAFB';
const MUTED = '#9CA3AF';
const MUTED2 = '#6B7280';
const BORDER = 'rgba(255,255,255,0.08)';

const MODULES = [
  { icon: 'storefront', label: 'Commerces', color: GREEN, desc: "Découvrez et soutenez les commerces locaux : promotions, vitrines et fidélité." },
  { icon: 'people', label: 'DCI', color: BLUE, desc: "Demandes & offres entre citoyens — entraide et services de proximité." },
  { icon: 'business', label: 'Commune', color: CYAN, desc: "Alertes officielles, travaux, démarches et actualités de votre commune." },
  { icon: 'car', label: 'Mobilité', color: '#F59E0B', desc: "Prix du carburant en temps réel et informations de circulation locale." },
  { icon: 'construct', label: 'Garages', color: '#7C3AED', desc: "Trouvez un garagiste, prenez rendez-vous et suivez vos services auto." },
] as const;

const WHY_POINTS = [
  { icon: 'flash', title: 'Tout, en un seul endroit', desc: "Commerces, événements, alertes et services communaux réunis dans une seule app." },
  { icon: 'shield-checkmark', title: 'Local et fiable', desc: "Des informations vérifiées, directement liées à votre commune et votre code postal." },
  { icon: 'sparkles', title: "Propulsé par l'IA", desc: "Recommandations, résumés et automatisations intelligentes pour gagner du temps." },
  { icon: 'infinite', title: 'Un OS, toutes les villes', desc: "DourConnect aujourd'hui, votre ville demain — la même plateforme, partout." },
] as const;

function useBreakpoint() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1000;
  const isTablet = width >= 700 && width < 1000;
  return { width, isDesktop, isTablet, isMobile: width < 700 };
}

export default function LandingScreen() {
  const router = useRouter();
  const { isDesktop, isTablet, isMobile } = useBreakpoint();

  // ── SEO (web uniquement) ──────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = 'DourConnect — VilleConnect OS | Votre commune connectée';
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    setMeta(
      'description',
      "DourConnect, propulsé par VilleConnect OS : commerces locaux, entraide citoyenne, alertes communales, carburant et garages — toute votre commune dans une seule app."
    );
    setMeta('theme-color', NAVY);
  }, []);

  const openLink = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  const contentMaxWidth = isDesktop ? 1080 : isTablet ? 760 : '100%';
  const heroDirection = isDesktop ? 'row' : 'column';

  return (
    <>
      <Stack.Screen options={{ title: 'DourConnect · VilleConnect OS', headerShown: false }} />
      <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', paddingHorizontal: isMobile ? 20 : 32 }}>

          {/* ── NAVBAR ── */}
          <View style={s.nav}>
            <View style={s.navBrand}>
              <Image source={require('../assets/icon.png')} style={s.navLogo} />
              <View>
                <Text style={s.navTitle}>DourConnect</Text>
                <Text style={s.navSubtitle}>VilleConnect OS™</Text>
              </View>
            </View>
            {!isMobile && (
              <View style={s.navLinks}>
                <Pressable onPress={() => openLink('mailto:contact@jsinnov.ia?subject=Devenir%20ville%20partenaire%20VilleConnect')}>
                  <Text style={s.navLink}>Devenir ville partenaire</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* ── HERO ── */}
          <View style={[s.hero, { flexDirection: heroDirection as any }]}>
            <View style={{ flex: 1, gap: 16 }}>
              <View style={s.badge}>
                <View style={s.badgeDot} />
                <Text style={s.badgeText}>Dour · 7370 — VilleConnect OS</Text>
              </View>
              <Text style={s.heroTitle}>
                Votre commune,{'\n'}
                <Text style={{ color: CYAN }}>dans votre poche.</Text>
              </Text>
              <Text style={s.heroDesc}>
                DourConnect réunit les commerces locaux, l'entraide citoyenne, les alertes
                communales, le carburant et les garages dans une seule application — pensée pour
                Dour, propulsée par le moteur territorial VilleConnect OS.
              </Text>

              {/* CTA buttons */}
              <View style={s.ctaRow}>
                <Pressable
                  style={[s.ctaBtn, s.ctaPrimary]}
                  onPress={() => openLink(DOWNLOAD_LINKS.webApp)}
                >
                  <Ionicons name="globe-outline" size={18} color="#fff" />
                  <Text style={s.ctaPrimaryText}>Ouvrir l'application web</Text>
                </Pressable>

                <Pressable
                  style={[s.ctaBtn, s.ctaSecondary]}
                  onPress={() => openLink(DOWNLOAD_LINKS.desktopApp)}
                >
                  <Ionicons name="desktop-outline" size={18} color={TEXT} />
                  <Text style={s.ctaSecondaryText}>Installer sur PC</Text>
                </Pressable>
              </View>

              <View style={s.ctaRow}>
                <Pressable
                  style={[s.ctaBtn, s.ctaOutline]}
                  onPress={() => openLink(DOWNLOAD_LINKS.android)}
                >
                  <Ionicons name="logo-google-playstore" size={18} color={GREEN} />
                  <Text style={s.ctaOutlineText}>Télécharger sur Android</Text>
                </Pressable>

                <Pressable
                  style={[s.ctaBtn, s.ctaOutline, !IOS_AVAILABLE && s.ctaDisabled]}
                  onPress={() => IOS_AVAILABLE && openLink(DOWNLOAD_LINKS.ios)}
                  disabled={!IOS_AVAILABLE}
                >
                  <Ionicons name="logo-apple" size={18} color={IOS_AVAILABLE ? TEXT : MUTED2} />
                  <Text style={[s.ctaOutlineText, !IOS_AVAILABLE && { color: MUTED2 }]}>
                    {IOS_AVAILABLE ? 'Télécharger sur iPhone' : 'iOS — bientôt disponible'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* QR CODE */}
            <View style={s.qrCard}>
              <Image source={require('../assets/qr-download.png')} style={s.qrImg} />
              <Text style={s.qrLabel}>📲 Scannez pour ouvrir</Text>
              <Text style={s.qrSub}>Depuis votre téléphone</Text>
            </View>
          </View>

          {/* ── POURQUOI DOURCONNECT ── */}
          <Text style={s.sectionLabel}>Pourquoi DourConnect ?</Text>
          <Text style={s.sectionTitle}>Une seule app pour toute votre commune</Text>
          <View style={[s.whyGrid, { flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' as any }]}>
            {WHY_POINTS.map((w) => (
              <View key={w.title} style={[s.whyCard, { width: isMobile ? '100%' : isTablet ? '47%' : '23.5%' }]}>
                <View style={s.whyIcon}>
                  <Ionicons name={w.icon as any} size={20} color={CYAN} />
                </View>
                <Text style={s.whyTitle}>{w.title}</Text>
                <Text style={s.whyDesc}>{w.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── MODULES ── */}
          <Text style={s.sectionLabel}>Les modules</Text>
          <Text style={s.sectionTitle}>Tout ce dont votre ville a besoin</Text>
          <View style={[s.moduleGrid, { flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' as any }]}>
            {MODULES.map((m) => (
              <View
                key={m.label}
                style={[
                  s.moduleCard,
                  { borderColor: m.color + '33', width: isMobile ? '100%' : isTablet ? '47%' : '31%' },
                ]}
              >
                <View style={[s.moduleIcon, { backgroundColor: m.color + '22' }]}>
                  <Ionicons name={m.icon as any} size={26} color={m.color} />
                </View>
                <Text style={s.moduleTitle}>{m.label}</Text>
                <Text style={s.moduleDesc}>{m.desc}</Text>
              </View>
            ))}
          </View>

          {/* ── SCREENSHOTS ── */}
          <Text style={s.sectionLabel}>Aperçu</Text>
          <Text style={s.sectionTitle}>À quoi ressemble DourConnect</Text>
          <View style={[s.shotsRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
            <Image source={require('../assets/screenshot-home.png')} style={s.shotImg} resizeMode="cover" />
            <Image source={require('../assets/screenshot-shops.png')} style={s.shotImg} resizeMode="cover" />
          </View>

          {/* ── CTA COMMUNE ── */}
          <View style={s.partnerCard}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.partnerTitle}>Vous représentez une commune ?</Text>
              <Text style={s.partnerDesc}>
                VilleConnect OS s'adapte à chaque ville en quelques jours — branding, données et
                modules dédiés. Discutons de votre commune connectée.
              </Text>
            </View>
            <Pressable
              style={[s.ctaBtn, s.ctaPrimary, { alignSelf: isMobile ? 'stretch' : 'center' }]}
              onPress={() =>
                openLink('mailto:contact@jsinnov.ia?subject=Devenir%20ville%20partenaire%20VilleConnect%20OS')
              }
            >
              <Ionicons name="mail-outline" size={18} color="#fff" />
              <Text style={s.ctaPrimaryText}>Contacter la commune / devenir ville partenaire</Text>
            </Pressable>
          </View>

          {/* ── FOOTER ── */}
          <View style={s.footer}>
            <Text style={s.footerText}>DourConnect · VilleConnect OS™</Text>
            <Text style={s.footerCopy}>© 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.</Text>
            <Pressable onPress={() => router.push('/(tabs)')}>
              <Text style={s.footerAppLink}>→ Retour à l'application</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLogo: { width: 40, height: 40, borderRadius: 10 },
  navTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
  navSubtitle: { color: MUTED, fontSize: 11, fontWeight: '600' },
  navLinks: { flexDirection: 'row', gap: 20 },
  navLink: { color: MUTED, fontSize: 13, fontWeight: '600' },

  hero: { gap: 32, paddingVertical: 32, alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,182,212,0.1)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN },
  badgeText: { color: CYAN, fontSize: 12, fontWeight: '700' },
  heroTitle: { color: TEXT, fontSize: 42, fontWeight: '900', lineHeight: 48, letterSpacing: -1 },
  heroDesc: { color: MUTED, fontSize: 16, lineHeight: 26, maxWidth: 520 },

  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12,
  },
  ctaPrimary: { backgroundColor: BLUE },
  ctaPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ctaSecondary: { backgroundColor: NAVY2, borderWidth: 1, borderColor: BORDER },
  ctaSecondaryText: { color: TEXT, fontSize: 14, fontWeight: '700' },
  ctaOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: BORDER },
  ctaOutlineText: { color: TEXT, fontSize: 14, fontWeight: '700' },
  ctaDisabled: { opacity: 0.5 },

  qrCard: {
    backgroundColor: NAVY2, borderWidth: 1, borderColor: BORDER, borderRadius: 20,
    padding: 20, alignItems: 'center', gap: 6,
  },
  qrImg: { width: 150, height: 150, borderRadius: 10 },
  qrLabel: { color: TEXT, fontSize: 13, fontWeight: '700', marginTop: 6 },
  qrSub: { color: MUTED, fontSize: 11 },

  sectionLabel: {
    color: BLUE, fontSize: 12, fontWeight: '800', letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 48, marginBottom: 8,
  },
  sectionTitle: { color: TEXT, fontSize: 26, fontWeight: '900', marginBottom: 24, letterSpacing: -0.5 },

  whyGrid: { gap: 16 },
  whyCard: {
    backgroundColor: NAVY2, borderWidth: 1, borderColor: BORDER, borderRadius: 16,
    padding: 20, gap: 10, marginBottom: 4,
  },
  whyIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(6,182,212,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  whyTitle: { color: TEXT, fontSize: 15, fontWeight: '700' },
  whyDesc: { color: MUTED, fontSize: 13, lineHeight: 19 },

  moduleGrid: { gap: 16 },
  moduleCard: {
    backgroundColor: NAVY2, borderWidth: 1, borderRadius: 18,
    padding: 22, gap: 10, marginBottom: 4,
  },
  moduleIcon: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  moduleTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
  moduleDesc: { color: MUTED, fontSize: 13, lineHeight: 19 },

  shotsRow: { gap: 20, marginBottom: 20 },
  shotImg: { flex: 1, height: 340, borderRadius: 20, borderWidth: 1, borderColor: BORDER },

  partnerCard: {
    marginTop: 48, backgroundColor: NAVY2, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)',
    borderRadius: 20, padding: 28, gap: 20,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
  },
  partnerTitle: { color: TEXT, fontSize: 19, fontWeight: '800' },
  partnerDesc: { color: MUTED, fontSize: 13, lineHeight: 20, maxWidth: 460 },

  footer: { alignItems: 'center', gap: 6, marginTop: 56, paddingTop: 24, borderTopWidth: 1, borderTopColor: BORDER },
  footerText: { color: TEXT, fontSize: 13, fontWeight: '700' },
  footerCopy: { color: MUTED2, fontSize: 11 },
  footerAppLink: { color: CYAN, fontSize: 12, fontWeight: '700', marginTop: 8 },
});
