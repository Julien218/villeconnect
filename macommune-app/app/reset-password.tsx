// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Écran atteint via le lien de l'email de reset : {WEB_APP_URL}/reset-password?token=...
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthHeader } from '@/components/auth-header';
import { trpcMutation } from '@/shared/api-client';

function isValidPassword(pw: string) {
  return pw.length >= 10 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!token) return setError('Lien invalide : aucun jeton trouvé.');
    if (!isValidPassword(password)) {
      return setError('Le mot de passe doit contenir 10 caractères minimum, une majuscule, une minuscule et un chiffre');
    }
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');

    setLoading(true);
    const { error: err } = await trpcMutation('auth.resetPassword', { token: String(token), newPassword: password });
    setLoading(false);
    if (err) return setError(err);
    setDone(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bgDeep }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.wrap}>
        <AuthHeader title="Nouveau mot de passe" />
        <GlassCard style={s.card}>
          {done ? (
            <>
              <Text style={s.emoji}>✅</Text>
              <Text style={s.text}>Ton mot de passe a été mis à jour. Toutes tes anciennes sessions ont été déconnectées par sécurité.</Text>
              <TouchableOpacity onPress={() => router.replace('/login')} style={{ width: '100%', marginTop: 18 }}>
                <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  <Text style={s.primaryBtnText}>Se connecter</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Text style={s.label}>Nouveau mot de passe</Text>
              <TextInput
                style={s.input} value={password} onChangeText={setPassword}
                placeholder="10 caractères min., Maj + min + chiffre" placeholderTextColor={theme.colors.textMuted}
                secureTextEntry autoCapitalize="none" testID="reset-password"
              />
              <Text style={s.label}>Confirmer</Text>
              <TextInput
                style={s.input} value={confirm} onChangeText={setConfirm}
                placeholder="••••••••••" placeholderTextColor={theme.colors.textMuted}
                secureTextEntry autoCapitalize="none" testID="reset-confirm"
              />
              <TouchableOpacity activeOpacity={0.85} onPress={submit} disabled={loading} style={{ width: '100%', marginTop: 20 }} testID="reset-submit">
                <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Réinitialiser</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.bgDeep },
  card: { width: '90%', maxWidth: 400, padding: theme.spacing.lg, marginTop: 10, alignItems: 'center' },
  label: { alignSelf: 'flex-start', color: theme.colors.textSecondary, fontSize: 12.5, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: {
    width: '100%', backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    color: theme.colors.textPrimary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5,
  },
  primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  error: { color: theme.colors.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  emoji: { fontSize: 36, marginBottom: 10 },
  text: { color: theme.colors.textSecondary, fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
});
