// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';

interface LoyaltyCardProps {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  trustScore: number;
  memberName: string;
  cityName: string;
  isMock?: boolean;
  onOpenRewards: () => void;
  onOpenHistory: () => void;
}

type TierKey = 'new' | 'bronze' | 'silver' | 'gold';

interface LoyaltyTier {
  key: TierKey;
  label: string;
  min: number;
  next: number | null;
  icon: keyof typeof Ionicons.glyphMap;
}

const TIERS: LoyaltyTier[] = [
  { key: 'new', label: 'Nouveau citoyen', min: 0, next: 300, icon: 'sparkles-outline' },
  { key: 'bronze', label: 'Bronze', min: 300, next: 1000, icon: 'medal-outline' },
  { key: 'silver', label: 'Argent', min: 1000, next: 2500, icon: 'ribbon-outline' },
  { key: 'gold', label: 'Or', min: 2500, next: null, icon: 'trophy-outline' },
];

const QR_PATTERN = [
  '11101110111',
  '10101010101',
  '11101110111',
  '00010100000',
  '11011010110',
  '00101101001',
  '11110111101',
  '10100100101',
  '11101111111',
  '00011000100',
  '11100110111',
];

function resolveTier(points: number) {
  const safePoints = Math.max(0, Number(points) || 0);
  const tier = [...TIERS].reverse().find(item => safePoints >= item.min) ?? TIERS[0];
  const nextTier = TIERS.find(item => item.min > safePoints) ?? null;
  const range = tier.next ? tier.next - tier.min : 1;
  const progress = tier.next
    ? Math.max(0, Math.min(1, (safePoints - tier.min) / range))
    : 1;

  return {
    tier,
    nextTier,
    progress,
    remaining: nextTier ? Math.max(0, nextTier.min - safePoints) : 0,
  };
}

function tierAccent(key: TierKey) {
  switch (key) {
    case 'bronze': return '#D99052';
    case 'silver': return '#C8D2E2';
    case 'gold': return '#F6C453';
    default: return '#00E5FF';
  }
}

export function LoyaltyCard({
  balance,
  totalEarned,
  totalSpent,
  trustScore,
  memberName,
  cityName,
  isMock = false,
  onOpenRewards,
  onOpenHistory,
}: LoyaltyCardProps) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [isBack, setIsBack] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  const actions = useRef(new Animated.Value(0)).current;
  const { tier, nextTier, progress, remaining } = useMemo(
    () => resolveTier(totalEarned),
    [totalEarned]
  );
  const accent = tierAccent(tier.key);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);

  const toggleCard = () => {
    const next = !isBack;
    setIsBack(next);
    if (reduceMotion) {
      flip.setValue(next ? 1 : 0);
      return;
    }
    Animated.timing(flip, {
      toValue: next ? 1 : 0,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const toggleActions = () => {
    const next = !actionsOpen;
    setActionsOpen(next);
    Animated.timing(actions, {
      toValue: next ? 1 : 0,
      duration: reduceMotion ? 0 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const shareCard = async () => {
    await Share.share({
      message: `Je participe à CivicLoop avec VilleConnect OS à ${cityName}. Ensemble, rendons notre ville plus active et plus solidaire.`,
    });
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const actionsHeight = actions.interpolate({ inputRange: [0, 1], outputRange: [0, 150] });
  const actionsTranslate = actions.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <View style={s.wrapper}>
      <TouchableOpacity
        activeOpacity={0.96}
        onPress={toggleCard}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Carte de fidélité CivicLoop, solde ${balance} crédits, palier ${tier.label}`}
        accessibilityHint={isBack ? 'Affiche le recto de la carte' : 'Affiche les statistiques et le QR sécurisé'}
        style={s.cardPressable}
      >
        <View style={s.cardScene}>
          <Animated.View style={[s.face, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }] as any}>
            <LinearGradient
              colors={['#06152F', '#073B73', '#00AFC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.cardGradient}
            >
              <View style={s.glowOne} />
              <View style={s.glowTwo} />

              <View style={s.cardTopRow}>
                <View style={s.brandBlock}>
                  <Image
                    source={require('../assets/logo-official-small.png')}
                    style={s.logo}
                    resizeMode="contain"
                    accessible={false}
                  />
                  <View>
                    <Text style={s.brandName}>VILLECONNECT OS</Text>
                    <Text style={s.brandProduct}>CARTE CIVICLOOP</Text>
                  </View>
                </View>
                <Ionicons name="wifi-outline" size={27} color="rgba(255,255,255,0.88)" style={{ transform: [{ rotate: '90deg' }] }} />
              </View>

              <View style={s.cardMiddle}>
                <View style={s.chip}>
                  <View style={s.chipLineHorizontal} />
                  <View style={s.chipLineVertical} />
                </View>
                <View style={s.balanceBlock}>
                  <Text style={s.balanceLabel}>SOLDE FIDÉLITÉ</Text>
                  <Text style={s.balanceValue}>{balance.toLocaleString('fr-BE')} <Text style={s.balanceUnit}>CL</Text></Text>
                  <View style={[s.tierPill, { borderColor: accent, backgroundColor: `${accent}22` }]}>
                    <Ionicons name={tier.icon} size={14} color={accent} />
                    <Text style={[s.tierPillText, { color: accent }]}>{tier.label.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={s.cardBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberLabel}>MEMBRE CIVICLOOP</Text>
                  <Text style={s.memberName} numberOfLines={1}>{memberName.toUpperCase()}</Text>
                  <Text style={s.memberCity}>{cityName}</Text>
                </View>
                {isMock && (
                  <View style={s.demoPill}>
                    <Ionicons name="cloud-offline-outline" size={12} color="#F6C453" />
                    <Text style={s.demoText}>MODE DÉMO</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[s.face, s.backFace, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }] as any}>
            <LinearGradient colors={['#061326', '#082B54', '#041A2D']} style={s.cardGradient}>
              <View style={s.magneticStripe} />
              <View style={s.backContent}>
                <View style={s.statsColumn}>
                  <BackStat label="POINTS GAGNÉS" value={`${totalEarned.toLocaleString('fr-BE')} CL`} accent="#00E5FF" styles={s} />
                  <BackStat label="POINTS DÉPENSÉS" value={`${totalSpent.toLocaleString('fr-BE')} CL`} accent="#BE6CFF" styles={s} />
                  <BackStat label="SCORE CONFIANCE" value={`${Math.max(0, Math.min(100, trustScore))}/100`} accent="#46E6A8" styles={s} />
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]} />
                  </View>
                  <Text style={s.progressText}>
                    {nextTier ? `${remaining} CL avant le palier ${nextTier.label}` : 'Palier maximum atteint'}
                  </Text>
                </View>

                <View style={s.qrBlock}>
                  <View style={s.qrFrame} accessible accessibilityLabel="QR sécurisé bientôt disponible">
                    {QR_PATTERN.map((row, rowIndex) => (
                      <View key={rowIndex} style={s.qrRow}>
                        {row.split('').map((cell, columnIndex) => (
                          <View
                            key={`${rowIndex}-${columnIndex}`}
                            style={[s.qrCell, cell === '1' && s.qrCellFilled]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                  <Text style={s.qrTitle}>QR SÉCURISÉ</Text>
                  <Text style={s.qrText}>Jeton temporaire lors du scan</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.flipHint} onPress={toggleCard} activeOpacity={0.75}>
        <Ionicons name="hand-left-outline" size={16} color={theme.colors.cyan} />
        <Text style={s.flipHintText}>{isBack ? 'Afficher le recto' : 'Touchez la carte pour la retourner'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.actionsToggle}
        onPress={toggleActions}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: actionsOpen }}
      >
        <View style={s.actionsToggleLeft}>
          <View style={s.actionsToggleIcon}>
            <Ionicons name="flash-outline" size={18} color={theme.colors.cyan} />
          </View>
          <View>
            <Text style={s.actionsToggleTitle}>Actions rapides</Text>
            <Text style={s.actionsToggleSub}>Carte, récompenses et historique</Text>
          </View>
        </View>
        <Ionicons name={actionsOpen ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Animated.View
        pointerEvents={actionsOpen ? 'auto' : 'none'}
        style={[
          s.actionsDrawer,
          {
            maxHeight: actionsHeight,
            opacity: actions,
            transform: [{ translateY: actionsTranslate }],
          },
        ]}
      >
        <ActionButton icon="card-outline" label="Présenter" onPress={() => !isBack && toggleCard()} styles={s} theme={theme} />
        <ActionButton icon="gift-outline" label="Récompenses" onPress={onOpenRewards} styles={s} theme={theme} />
        <ActionButton icon="receipt-outline" label="Historique" onPress={onOpenHistory} styles={s} theme={theme} />
        <ActionButton icon="share-social-outline" label="Partager" onPress={shareCard} styles={s} theme={theme} />
      </Animated.View>
    </View>
  );
}

function BackStat({ label, value, accent, styles }: { label: string; value: string; accent: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.backStat}>
      <Text style={styles.backStatLabel}>{label}</Text>
      <Text style={[styles.backStatValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  styles,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: ThemeTokens;
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.75} accessibilityRole="button">
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.cyan} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrapper: { marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
    cardPressable: { borderRadius: 24 },
    cardScene: { height: 232, position: 'relative' },
    face: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 24,
      backfaceVisibility: 'hidden',
      overflow: 'hidden',
      ...theme.shadow.glow,
    },
    backFace: { transform: [{ rotateY: '180deg' }] },
    cardGradient: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(83,211,255,0.6)' },
    glowOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -60, top: -65, backgroundColor: 'rgba(0,229,255,0.14)' },
    glowTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, left: -70, bottom: -80, backgroundColor: 'rgba(0,79,255,0.2)' },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: { width: 42, height: 42 },
    brandName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.7 },
    brandProduct: { color: '#55E9FF', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
    cardMiddle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
    chip: { width: 48, height: 36, borderRadius: 9, backgroundColor: '#EAD59D', borderWidth: 1, borderColor: '#FFF0BF', overflow: 'hidden' },
    chipLineHorizontal: { position: 'absolute', left: 0, right: 0, top: 17, height: 1, backgroundColor: 'rgba(94,69,25,0.35)' },
    chipLineVertical: { position: 'absolute', top: 0, bottom: 0, left: 23, width: 1, backgroundColor: 'rgba(94,69,25,0.35)' },
    balanceBlock: { alignItems: 'flex-end' },
    balanceLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    balanceValue: { color: '#FFFFFF', fontSize: 39, fontWeight: '900', marginTop: 1 },
    balanceUnit: { color: '#46E6A8', fontSize: 19, fontWeight: '900' },
    tierPill: { flexDirection: 'row', gap: 5, alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, marginTop: 4 },
    tierPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
    cardBottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    memberLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
    memberName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5, marginTop: 2, maxWidth: 220 },
    memberCity: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 },
    demoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(246,196,83,0.5)', paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(246,196,83,0.1)' },
    demoText: { color: '#F6C453', fontSize: 8, fontWeight: '900' },
    magneticStripe: { height: 42, marginHorizontal: -20, marginTop: 4, backgroundColor: '#090B0F' },
    backContent: { flex: 1, flexDirection: 'row', gap: 14, paddingTop: 15 },
    statsColumn: { flex: 1 },
    backStat: { marginBottom: 8 },
    backStatLabel: { color: 'rgba(255,255,255,0.58)', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
    backStatValue: { fontSize: 16, fontWeight: '900', marginTop: 1 },
    progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginTop: 1 },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { color: 'rgba(255,255,255,0.62)', fontSize: 8, marginTop: 5 },
    qrBlock: { width: 110, alignItems: 'center', justifyContent: 'center' },
    qrFrame: { width: 92, height: 92, padding: 6, borderRadius: 13, borderWidth: 3, borderColor: '#4DDCFF', backgroundColor: '#FFFFFF', ...theme.shadow.glow },
    qrRow: { flex: 1, flexDirection: 'row' },
    qrCell: { flex: 1, margin: 0.4 },
    qrCellFilled: { backgroundColor: '#051326' },
    qrTitle: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', marginTop: 7, letterSpacing: 0.5 },
    qrText: { color: 'rgba(255,255,255,0.56)', fontSize: 7, textAlign: 'center', marginTop: 2 },
    flipHint: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 12 },
    flipHintText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
    actionsToggle: { minHeight: 62, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.borderCyan, backgroundColor: theme.colors.surfaceSolid, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    actionsToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    actionsToggleIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.cyanSoft },
    actionsToggleTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    actionsToggleSub: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
    actionsDrawer: { flexDirection: 'row', gap: 8, overflow: 'hidden', paddingTop: 10 },
    actionButton: { flex: 1, minHeight: 85, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSolid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    actionIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: theme.colors.cyanSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    actionLabel: { color: theme.colors.textSecondary, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  });
}
