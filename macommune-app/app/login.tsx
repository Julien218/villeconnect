// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthHeader } from '@/components/auth-header';
import { useAuth } from '@/shared/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.includes('@') || !password) return setError('Renseigne ton email et ton mot de passe');
    setLoading(true);
    const res = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!res.ok) return setError(res.error || 'Email ou mot de passe incorrect');
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bgDeep }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Bon retour !" subtitle="Connecte-toi à ton espace citoyen" />
        <GlassCard style={s.card}>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input} value={email} onChangeText={setEmail}
            placeholder="toi@exemple.com" placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none" keyboardType="email-address" testID="login-email"
          />

          <Text style={s.label}>Mot de passe</Text>
          <TextInput
            style={s.input} value={password} onChangeText={setPassword}
            placeholder="••••••••••" placeholderTextColor={theme.colors.textMuted}
            secureTextEntry autoCapitalize="none" testID="login-password"
          />

          <TouchableOpacity onPress={() => router.push('/forgot-password')} style={s.forgotBtn}>
            <Text style={s.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={submit} disabled={loading} style={{ borderRadius: theme.radius.pill, width: '100%', marginTop: 8 }} testID="login-submit">
            <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Se connecter</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/register')} style={s.linkBtn}>
            <Text style={s.linkText}>Pas encore de compte ? <Text style={s.linkAccent}>S'inscrire</Text></Text>
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
    forgotBtn: { alignSelf: 'flex-end', marginTop: 8 },
    forgotText: { color: theme.colors.cyan, fontSize: 12.5, fontWeight: '600' },
    primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    linkBtn: { alignItems: 'center', marginTop: 16 },
    linkText: { color: theme.colors.textSecondary, fontSize: 13 },
    linkAccent: { color: theme.colors.cyan, fontWeight: '700' },
    error: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  });
}
