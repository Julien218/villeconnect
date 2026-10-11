// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Écran-relais affiché dans un onglet protégé (Profil, commandes...) quand l'utilisateur
// n'est pas connecté — invite propre à se connecter ou créer un compte, sans casser
// la navigation publique du reste de l'app. S'adapte au thème actif.
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from './glass-card';

export function AuthGate({ message }: { message?: string }) {
  const { theme } = useTheme();
  const s = makeStyles(theme);
  return (
    <View style={s.wrap}>
      <Image source={require('../assets/logo-official-small.png')} style={s.logo} resizeMode="contain" />
      <GlassCard style={s.card}>
        <Text style={s.title}>Connexion requise</Text>
        <Text style={s.desc}>
          {message || 'Cette section est réservée aux citoyens connectés — crée ton compte ou connecte-toi pour continuer.'}
        </Text>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/login')} style={{ width: '100%' }}>
          <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>Se connecter</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/register')} style={s.secondaryBtn}>
          <Text style={s.secondaryBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.bgDeep },
    logo: { width: 72, height: 72, marginBottom: 18 },
    card: { width: '100%', maxWidth: 380, padding: theme.spacing.lg, alignItems: 'center' },
    title: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8, fontFamily: theme.fonts.bold },
    desc: { color: theme.colors.textSecondary, fontSize: 13.5, textAlign: 'center', marginBottom: 18, lineHeight: 19 },
    primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 13, alignItems: 'center', width: '100%' },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    secondaryBtn: { marginTop: 12, paddingVertical: 10 },
    secondaryBtnText: { color: theme.colors.cyan, fontWeight: '700', fontSize: 13.5 },
  });
}
