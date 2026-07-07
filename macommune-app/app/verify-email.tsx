// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Écran atteint via le lien de l'email de confirmation : {WEB_APP_URL}/verify-email?token=...
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthHeader } from '@/components/auth-header';
import { trpcMutation } from '@/shared/api-client';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus('error');
        setMessage('Lien invalide : aucun jeton de vérification trouvé.');
        return;
      }
      const { data, error } = await trpcMutation<{ success: boolean }>('auth.verifyEmail', { token: String(token) });
      if (error || !data?.success) {
        setStatus('error');
        setMessage(error || 'Ce lien de vérification est invalide ou a expiré.');
        return;
      }
      setStatus('success');
    })();
  }, [token]);

  return (
    <View style={s.wrap}>
      <AuthHeader title="Confirmation de compte" />
      <GlassCard style={s.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator color={theme.colors.cyan} size="large" />
            <Text style={s.text}>Vérification en cours…</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text style={s.emoji}>✅</Text>
            <Text style={s.title}>Adresse email confirmée !</Text>
            <Text style={s.text}>Ton compte est maintenant actif. Tu peux te connecter.</Text>
            <TouchableOpacity onPress={() => router.replace('/login')} style={{ width: '100%', marginTop: 18 }}>
              <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>Se connecter</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={s.emoji}>⚠️</Text>
            <Text style={s.title}>Impossible de confirmer</Text>
            <Text style={s.text}>{message}</Text>
            <TouchableOpacity onPress={() => router.replace('/register')} style={{ width: '100%', marginTop: 18 }}>
              <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>Retour à l'inscription</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </GlassCard>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.bgDeep },
  card: { width: '90%', maxWidth: 400, padding: theme.spacing.lg, marginTop: 20, alignItems: 'center' },
  emoji: { fontSize: 40, marginBottom: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  text: { color: theme.colors.textSecondary, fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
