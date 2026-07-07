// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Sélecteur de thème réutilisable (3 options) — utilisé à l'inscription et dans les
// paramètres du profil. Style "bouton tertiaire / segmenté" conforme à la planche ADN.
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';
import { ThemeMode } from '@/shared/theme';

const OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Clair', icon: 'sunny' },
  { key: 'dark', label: 'Sombre', icon: 'moon' },
  { key: 'auto', label: 'Auto', icon: 'contrast' },
];

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { mode, setMode, theme } = useTheme();

  return (
    <View style={[s.wrap, { backgroundColor: theme.colors.surfaceSolid, borderColor: theme.colors.border }]}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            onPress={() => setMode(opt.key)}
            style={[
              s.option,
              compact && s.optionCompact,
              active && { backgroundColor: theme.colors.electric },
            ]}
            testID={`theme-option-${opt.key}`}
          >
            <Ionicons name={opt.icon} size={15} color={active ? '#fff' : theme.colors.textSecondary} />
            <Text style={[s.label, { color: active ? '#fff' : theme.colors.textSecondary, fontFamily: theme.fonts.semibold }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 4, gap: 4,
  },
  option: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 999,
  },
  optionCompact: { paddingVertical: 7 },
  label: { fontSize: 12.5 },
});
