// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthHeader } from '@/components/auth-header';
import { ThemePicker } from '@/components/theme-picker';
import { useAuth } from '@/shared/auth-context';

function isValidPassword(pw: string) {
  return pw.length >= 10 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const { theme, mode } = useTheme();
  const s = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [postalCode, setPostalCode] = useState('7370');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Adresse email invalide');
    if (!isValidPassword(password)) {
      return setError('Le mot de passe doit contenir 10 caractères minimum, une majuscule, une minuscule et un chiffre');
    }
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');

    setLoading(true);
    // La préférence de thème choisie ci-dessous (par défaut : celle déjà active,
    // ex. suivie du système) est envoyée dès l'inscription pour être retrouvée
    // immédiatement sur tout futur appareil connecté à ce compte.
    const res = await register({
      email: email.trim().toLowerCase(), password, postalCode: postalCode.trim() || undefined,
      themePreference: mode,
    });
    setLoading(false);

    if (!res.ok) return setError(res.error || 'Une erreur est survenue');
    setDone(true);
  };

  if (done) {
    return (
      <View style={s.wrap}>
        <AuthHeader title="Vérifie ta boîte email" subtitle={`Un email de confirmation a été envoyé à ${email}. Clique sur le lien pour activer ton compte.`} />
        <GlassCard style={s.card}>
          <Text style={s.info}>📬 Pense à vérifier tes spams si tu ne vois rien arriver.</Text>
          <TouchableOpacity onPress={() => router.replace('/login')} style={{ width: '100%', marginTop: 18 }}>
            <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>Aller à la connexion</Text>
            </LinearGradient>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bgDeep }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Créer un compte" subtitle="Rejoins ta commune connectée" />
        <GlassCard style={s.card}>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input} value={email} onChangeText={setEmail}
            placeholder="toi@exemple.com" placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none" keyboardType="email-address" testID="register-email"
          />

          <Text style={s.label}>Mot de passe</Text>
          <TextInput
            style={s.input} value={password} onChangeText={setPassword}
            placeholder="10 caractères min., Maj + min + chiffre" placeholderTextColor={theme.colors.textMuted}
            secureTextEntry autoCapitalize="none" testID="register-password"
          />

          <Text style={s.label}>Confirmer le mot de passe</Text>
          <TextInput
            style={s.input} value={confirm} onChangeText={setConfirm}
            placeholder="••••••••••" placeholderTextColor={theme.colors.textMuted}
            secureTextEntry autoCapitalize="none" testID="register-confirm"
          />

          <Text style={s.label}>Code postal</Text>
          <TextInput
            style={s.input} value={postalCode} onChangeText={setPostalCode}
            placeholder="7370" placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad" maxLength={4} testID="register-postal"
          />

          <Text style={s.label}>Apparence de l'application</Text>
          <ThemePicker compact />

          <TouchableOpacity activeOpacity={0.85} onPress={submit} disabled={loading} style={{ width: '100%', marginTop: 20 }} testID="register-submit">
            <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Créer mon compte</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login')} style={s.linkBtn}>
            <Text style={s.linkText}>Déjà un compte ? <Text style={s.linkAccent}>Se connecter</Text></Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: { flexGrow: 1, alignItems: 'center', backgroundColor: theme.colors.bgDeep, paddingBottom: 40 },
    card: { width: '90%', maxWidth: 400, padding: theme.spacing.lg, marginTop: 10 },
    label: { color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    input: {
      backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
      color: theme.colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5,
    },
    primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    linkBtn: { alignItems: 'center', marginTop: 16 },
    linkText: { color: theme.colors.textSecondary, fontSize: 13 },
    linkAccent: { color: theme.colors.cyan, fontWeight: '700' },
    error: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
    info: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' },
  });
}
