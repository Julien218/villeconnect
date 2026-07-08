// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthHeader } from '@/components/auth-header';
import { trpcMutation } from '@/shared/api-client';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Adresse email invalide');
    setLoading(true);
    const { error: err } = await trpcMutation('auth.requestPasswordReset', { email: email.trim().toLowerCase() });
    setLoading(false);
    if (err) return setError(err);
    setDone(true); // le backend répond toujours "succès" par anti-énumération de comptes
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bgDeep }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.wrap}>
        <AuthHeader title="Mot de passe oublié" subtitle="On t'envoie un lien de réinitialisation par email" />
        <GlassCard style={s.card}>
          {done ? (
            <>
              <Text style={s.emoji}>📬</Text>
              <Text style={s.text}>Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Vérifie ta boîte (et tes spams).</Text>
              <TouchableOpacity onPress={() => router.replace('/login')} style={{ width: '100%', marginTop: 18 }}>
                <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  <Text style={s.primaryBtnText}>Retour à la connexion</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input} value={email} onChangeText={setEmail}
                placeholder="toi@exemple.com" placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none" keyboardType="email-address" testID="forgot-email"
              />
              <TouchableOpacity activeOpacity={0.85} onPress={submit} disabled={loading} style={{ width: '100%', marginTop: 20 }} testID="forgot-submit">
                <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Envoyer le lien</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/login')} style={s.linkBtn}>
                <Text style={s.linkText}>Retour à la <Text style={s.linkAccent}>connexion</Text></Text>
              </TouchableOpacity>
            </>
          )}
        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.bgDeep },
    card: { width: '90%', maxWidth: 400, padding: theme.spacing.lg, marginTop: 10, alignItems: 'center' },
    label: { alignSelf: 'flex-start', color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
    input: {
      width: '100%', backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
      color: theme.colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5,
    },
    primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    linkBtn: { alignItems: 'center', marginTop: 16 },
    linkText: { color: theme.colors.textSecondary, fontSize: 13 },
    linkAccent: { color: theme.colors.cyan, fontWeight: '700' },
    error: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
    emoji: { fontSize: 36, marginBottom: 10 },
    text: { color: theme.colors.textSecondary, fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
  });
}
