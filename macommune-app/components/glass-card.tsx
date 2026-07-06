// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Carte "glassmorphism" réutilisable — fond semi-transparent + bordure fine lumineuse.
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/shared/theme';

export function GlassCard({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[s.card, style as any]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
});
