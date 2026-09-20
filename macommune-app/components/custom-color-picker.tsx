// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme-context';

const HEX_COLOR = /^#[0-9A-F]{6}$/;

export function CustomColorPicker() {
  const { accentColor, setAccentColor, theme } = useTheme();
  const [value, setValue] = useState(accentColor || theme.colors.electric);
  const normalized = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
  const isValid = HEX_COLOR.test(normalized);

  useEffect(() => {
    setValue(accentColor || theme.colors.electric);
  }, [accentColor]);

  const apply = () => {
    if (isValid) setAccentColor(normalized);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Couleur personnalisée</Text>
      <View style={styles.row}>
        <View
          style={[
            styles.preview,
            { backgroundColor: isValid ? normalized : theme.colors.surfaceSolid, borderColor: theme.colors.border },
          ]}
          accessibilityLabel="Aperçu de la couleur"
        />
        <TextInput
          value={value}
          onChangeText={setValue}
          onSubmitEditing={apply}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          placeholder="#0047FF"
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel="Code couleur hexadécimal"
          testID="custom-color-input"
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surfaceSolid,
              borderColor: isValid ? theme.colors.border : theme.colors.danger,
            },
          ]}
        />
        <TouchableOpacity
          onPress={apply}
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityLabel="Appliquer la couleur"
          testID="apply-custom-color"
          style={[styles.applyButton, { backgroundColor: isValid ? normalized : theme.colors.textMuted }]}
        >
          <Ionicons name="checkmark" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {!isValid ? (
        <Text style={[styles.help, { color: theme.colors.danger }]}>Utilise un code à 6 caractères, par exemple #8B5CF6.</Text>
      ) : (
        <Text style={[styles.help, { color: theme.colors.textMuted }]}>Saisis n’importe quelle couleur au format hexadécimal.</Text>
      )}
      {accentColor ? (
        <TouchableOpacity
          onPress={() => setAccentColor(null)}
          accessibilityRole="button"
          testID="reset-custom-color"
          style={styles.resetButton}
        >
          <Ionicons name="refresh-outline" size={15} color={theme.colors.textSecondary} />
          <Text style={[styles.resetText, { color: theme.colors.textSecondary }]}>Revenir aux couleurs VilleConnect</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  preview: { width: 42, height: 42, borderRadius: 13, borderWidth: 1 },
  input: { flex: 1, height: 42, borderRadius: 13, borderWidth: 1, paddingHorizontal: 13, fontSize: 14, fontWeight: '700' },
  applyButton: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  help: { fontSize: 10.5, lineHeight: 15, marginTop: 6 },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11, alignSelf: 'flex-start' },
  resetText: { fontSize: 11.5, fontWeight: '700' },
});
