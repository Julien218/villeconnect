// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { SecureQr } from '@/components/secure-qr';

export interface ActiveRedemption {
  id: number;
  rewardId: number;
  rewardTitle: string;
  creditsSpent: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  expiresAt: string;
  token?: string;
}

interface RewardPassProps {
  redemption: ActiveRedemption;
  cancelling?: boolean;
  onCancel: () => void;
  onExpired: () => void;
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RewardPass({ redemption, cancelling = false, onCancel, onExpired }: RewardPassProps) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const expiry = useMemo(() => new Date(redemption.expiresAt).getTime(), [redemption.expiresAt]);
  const [remaining, setRemaining] = useState(() => expiry - Date.now());
  const expirationHandled = useRef(false);
  const shortCode = `VC-${redemption.id}-${(redemption.token || '').slice(-6).toUpperCase()}`;

  useEffect(() => {
    expirationHandled.current = false;
    const update = () => {
      const next = expiry - Date.now();
      setRemaining(next);
      if (next <= 0 && !expirationHandled.current) {
        expirationHandled.current = true;
        onExpired();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry, onExpired]);

  const shareSecureCode = async () => {
    if (!redemption.token) return;
    await Share.share({
      title: 'Code CivicLoop',
      message: `Code temporaire CivicLoop pour ${redemption.rewardTitle}\n${redemption.token}`,
    });
  };

  return (
    <LinearGradient colors={['#07172F', '#073C69', '#035A72']} style={s.container}>
      <View style={s.header}>
        <View style={s.statusPill}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>RÉCOMPENSE RÉSERVÉE</Text>
        </View>
        <View style={s.timerPill}>
          <Ionicons name="time-outline" size={15} color="#FFFFFF" />
          <Text style={s.timerText}>{formatRemaining(remaining)}</Text>
        </View>
      </View>

      <Text style={s.title}>{redemption.rewardTitle}</Text>
      <Text style={s.subtitle}>{redemption.creditsSpent} CL sont réservés jusqu’à la validation du commerçant.</Text>

      <View style={s.qrSection}>
        <View style={s.qrFrame}>
          <SecureQr value={redemption.token || ''} size={184} />
        </View>
        <Text style={s.qrLabel}>SCAN COMMERÇANT</Text>
        <Text style={s.qrHint}>Présentez ce QR uniquement au partenaire concerné. Il expire automatiquement.</Text>
      </View>

      <View style={s.codeInfo}>
        <Text style={s.codeLabel}>CODE DE SECOURS</Text>
        <Text style={s.shortCode} selectable>{shortCode}</Text>
        <Text style={s.codeHint}>Le jeton complet reste sélectionnable ci-dessous si la caméra du commerçant est indisponible.</Text>
      </View>

      <View style={s.tokenBox}>
        <Text style={s.tokenLabel}>JETON TEMPORAIRE SIGNÉ</Text>
        <Text style={s.tokenText} selectable numberOfLines={3}>{redemption.token || 'Jeton indisponible — actualisez le Wallet.'}</Text>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.actionButton, !redemption.token && s.actionDisabled]}
          onPress={shareSecureCode}
          disabled={!redemption.token}
          accessibilityRole="button"
        >
          <Ionicons name="share-social-outline" size={17} color={theme.colors.cyan} />
          <Text style={s.actionText}>Partager le code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.cancelButton, cancelling && s.actionDisabled]}
          onPress={onCancel}
          disabled={cancelling}
          accessibilityRole="button"
        >
          <Ionicons name="close-circle-outline" size={17} color={theme.colors.danger} />
          <Text style={s.cancelText}>{cancelling ? 'Annulation…' : 'Annuler et rembourser'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.notice}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#55E9FF" />
        <Text style={s.noticeText}>Le QR est généré localement dans l’application. Aucun identifiant personnel ni solde n’est exposé.</Text>
      </View>
    </LinearGradient>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(85,233,255,0.55)' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(70,230,168,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#46E6A8' },
    statusText: { color: '#46E6A8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    timerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    timerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
    title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 15 },
    subtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 12, lineHeight: 18, marginTop: 5 },
    qrSection: { alignItems: 'center', marginTop: 18 },
    qrFrame: { backgroundColor: '#FFFFFF', padding: 8, borderRadius: 16, borderWidth: 3, borderColor: '#55E9FF' },
    qrLabel: { color: '#55E9FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 9 },
    qrHint: { color: 'rgba(255,255,255,0.65)', fontSize: 9, lineHeight: 14, textAlign: 'center', maxWidth: 250, marginTop: 4 },
    codeInfo: { alignItems: 'center', marginTop: 14 },
    codeLabel: { color: '#55E9FF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    shortCode: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 4 },
    codeHint: { color: 'rgba(255,255,255,0.65)', fontSize: 10, lineHeight: 15, marginTop: 6, textAlign: 'center' },
    tokenBox: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 12, padding: 12, marginTop: 15 },
    tokenLabel: { color: 'rgba(255,255,255,0.54)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    tokenText: { color: '#FFFFFF', fontSize: 10, lineHeight: 15, marginTop: 5 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(85,233,255,0.5)', paddingVertical: 10 },
    cancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,91,111,0.45)', paddingVertical: 10 },
    actionDisabled: { opacity: 0.45 },
    actionText: { color: theme.colors.cyan, fontSize: 11, fontWeight: '800' },
    cancelText: { color: theme.colors.danger, fontSize: 11, fontWeight: '800' },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    noticeText: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 9, lineHeight: 13 },
  });
}
