// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';
import { ThemePicker } from '@/components/theme-picker';
import { useAuth } from '@/shared/auth-context';
import { getBranding } from '@/shared/branding';

// Villes actuellement reconnues par le moteur de branding — d'autres arrivent bientôt.
const KNOWN_POSTAL_CODES = ['7370'];

export default function ProfileScreen() {
  const { user, isLoading, logout, updateProfile } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [name, setName] = useState(user?.name || '');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '7370');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={s.centerFull}>
        <ActivityIndicator color={theme.colors.cyan} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthGate message="Connecte-toi pour gérer ton profil, ta ville et tes informations personnelles." />;
  }

  const branding = getBranding(postalCode);
  const cityRecognized = KNOWN_POSTAL_CODES.includes(postalCode.trim());

  const save = async () => {
    setMessage(null);
    setSaving(true);
    const res = await updateProfile({ name: name.trim() || undefined, postalCode: postalCode.trim() || undefined, city: branding.cityName });
    setSaving(false);
    setMessage(res.ok ? 'Profil mis à jour ✅' : res.error || 'Erreur lors de la mise à jour');
  };

  const confirmLogout = () => {
    Alert.alert('Se déconnecter', 'Tu vas être déconnecté de ton compte.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => { await logout(); router.replace('/(tabs)'); } },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <GlassCard style={s.card}>
        <View style={s.avatarWrap}>
          <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} style={s.avatar}>
            <Text style={s.avatarLetter}>{(user.email?.[0] || '?').toUpperCase()}</Text>
          </LinearGradient>
          <Text style={s.email}>{user.email}</Text>
          <View style={[s.badge, { backgroundColor: user.emailVerified ? theme.colors.badges.nouveau.bg : theme.colors.badges.important.bg }]}>
            <Text style={{ color: user.emailVerified ? theme.colors.success : theme.colors.warning, fontSize: 11, fontWeight: '700' }}>
              {user.emailVerified ? '✓ Email vérifié' : '⚠ Email non vérifié'}
            </Text>
          </View>
        </View>

        {message ? <Text style={s.message}>{message}</Text> : null}

        <Text style={s.label}>Nom (optionnel)</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ton prénom" placeholderTextColor={theme.colors.textMuted} />

        <Text style={s.label}>Ville / code postal</Text>
        <TextInput
          style={s.input} value={postalCode} onChangeText={setPostalCode}
          placeholder="7370" placeholderTextColor={theme.colors.textMuted} keyboardType="number-pad" maxLength={4}
        />
        <Text style={s.hint}>
          {cityRecognized
            ? `📍 ${branding.cityName} — ${branding.appName} actif`
            : '📍 Ville pas encore couverte — l’app utilisera le branding générique VilleConnect en attendant.'}
        </Text>

        <TouchableOpacity activeOpacity={0.85} onPress={save} disabled={saving} style={{ width: '100%', marginTop: 18 }}>
          <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Enregistrer</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </GlassCard>

      {/* ── Apparence ── */}
      <GlassCard style={[s.card, { marginTop: 14 }]}>
        <Text style={s.sectionTitle}>Apparence</Text>
        <Text style={s.hint}>Choisis le thème de l'application. En mode automatique, elle suit les réglages de ton téléphone.</Text>
        <View style={{ marginTop: 12 }}>
          <ThemePicker />
        </View>
      </GlassCard>

      <TouchableOpacity onPress={confirmLogout} style={s.logoutBtn}>
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: { flexGrow: 1, alignItems: 'center', backgroundColor: theme.colors.bgDeep, padding: theme.spacing.lg, paddingBottom: 110 },
    centerFull: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgDeep },
    card: { width: '100%', maxWidth: 420, padding: theme.spacing.lg },
    avatarWrap: { alignItems: 'center', marginBottom: 18 },
    avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    avatarLetter: { color: '#fff', fontSize: 26, fontWeight: '900' },
    email: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
    badge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
    label: { color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', fontFamily: theme.fonts.bold },
    input: {
      backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
      color: theme.colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5,
    },
    hint: { color: theme.colors.textMuted, fontSize: 11.5, marginTop: 6, lineHeight: 16 },
    message: { color: theme.colors.cyan, fontSize: 13, marginBottom: 8, textAlign: 'center' },
    primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    logoutBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
    logoutText: { color: theme.colors.danger, fontSize: 13.5, fontWeight: '700' },
  });
}
