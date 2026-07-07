// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Carte "glassmorphism" réutilisable — fond semi-transparent + bordure fine lumineuse.
// S'adapte automatiquement au thème actif (clair / sombre / automatique).
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme-context';

export function GlassCard({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadow.card,
        },
        style as any,
      ]}
    >
      {children}
    </View>
  );
}
