// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Header réutilisable pour les écrans d'authentification — logo officiel (jamais modifié) + retour.
// S'adapte automatiquement au thème actif (clair / sombre / automatique).
import { View, Text, StyleSheet, Image, } from 'react-native';
import { NeonTouchableOpacity as TouchableOpacity } from '@/components/neon-button';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Image source={require('../assets/logo-official-small.png')} style={s.logo} resizeMode="contain" />
      <Text style={[s.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>{title}</Text>
      {subtitle ? <Text style={[s.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 18, paddingBottom: 8 },
  back: { position: 'absolute', left: 16, top: 18, padding: 6, zIndex: 10 },
  logo: { width: 64, height: 64, marginBottom: 10 },
  title: { fontSize: 22 },
  subtitle: { fontSize: 13.5, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },
});
