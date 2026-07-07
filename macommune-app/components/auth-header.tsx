// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Header réutilisable pour les écrans d'authentification — logo officiel + retour.
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/shared/theme';

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Image source={require('../assets/logo-official.png')} style={s.logo} resizeMode="contain" />
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 18, paddingBottom: 8 },
  back: { position: 'absolute', left: 16, top: 18, padding: 6, zIndex: 10 },
  logo: { width: 64, height: 64, marginBottom: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: theme.colors.textSecondary, fontSize: 13.5, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },
});
