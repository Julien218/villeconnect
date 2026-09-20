// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';
import { FuelPosition } from '@/shared/use-fuel-location';

export function FuelLocationControls({ position, locating, error, radiusKm, onRadius, onLocate }: {
  position: FuelPosition | null;
  locating: boolean;
  error: string | null;
  radiusKm: number;
  onRadius: (radius: number) => void;
  onLocate: () => void;
}) {
  const { theme: { colors } } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
      <View style={s.heading}>
        <Ionicons name="locate-outline" size={22} color={colors.cyan} />
        <Text style={[s.title, { color: colors.textPrimary }]}>Autour de moi</Text>
        {locating && <ActivityIndicator color={colors.cyan} />}
      </View>
      <Text accessibilityLiveRegion="polite" style={[s.message, { color: error ? colors.warning : colors.textSecondary }]}>
        {locating ? 'Recherche de votre position…' : error || (position
          ? `Position détectée · stations dans un rayon de ${radiusKm} km`
          : 'Autorisez votre localisation pour trouver les stations proches.')}
      </Text>
      {position?.accuracy != null && position.accuracy > 1000 && (
        <Text style={[s.message, { color: colors.warning }]}>Position approximative (± {Math.round(position.accuracy / 1000)} km) : les distances peuvent être imprécises.</Text>
      )}
      <Text style={[s.caption, { color: colors.textMuted }]}>Votre position sert à cette recherche, sans suivi en arrière-plan. Distances à vol d’oiseau.</Text>
      <Text style={[s.label, { color: colors.textSecondary }]}>Rayon de recherche</Text>
      <View style={s.radii}>
        {[5, 10, 25, 50].map(radius => (
          <TouchableOpacity key={radius} accessibilityRole="button" accessibilityLabel={`Rayon ${radius} km`}
            accessibilityState={{ selected: radius === radiusKm }} onPress={() => onRadius(radius)}
            style={[s.radius, { borderColor: radius === radiusKm ? colors.cyan : colors.border,
              backgroundColor: radius === radiusKm ? colors.cyanSoft : colors.bgDeep }]}>
            <Text style={{ color: radius === radiusKm ? colors.cyan : colors.textSecondary, fontWeight: '700' }}>{radius} km</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Actualiser ma position"
        accessibilityState={{ disabled: locating }} disabled={locating} onPress={onLocate}
        style={[s.locate, { backgroundColor: colors.cyanSoft, opacity: locating ? 0.5 : 1 }]}>
        <Ionicons name="refresh-outline" size={17} color={colors.cyan} />
        <Text style={{ color: colors.cyan, fontWeight: '700' }}>Actualiser ma position</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 14, padding: 18, borderRadius: 20, borderWidth: 1, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { fontSize: 16, fontWeight: '800', flex: 1 },
  message: { fontSize: 13, lineHeight: 20 },
  caption: { fontSize: 11, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  radii: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radius: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  locate: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
});
