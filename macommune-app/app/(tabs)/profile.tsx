// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { trpcMutation } from '@/shared/api-client';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';
import { ThemePicker } from '@/components/theme-picker';
import { CustomColorPicker } from '@/components/custom-color-picker';
import { useAuth } from '@/shared/auth-context';
import { getBranding } from '@/shared/branding';

const KNOWN_POSTAL_CODES = ['7370'];

export default function ProfileScreen() {
  const { user, isLoading, logout, updateProfile } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [name, setName] = useState(user?.name || '');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '7370');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [erasing, setErasing] = useState(false);

  if (isLoading) {
    return (
      <View style={s.centerFull}>
        <ActivityIndicator color={theme.colors.cyan} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthGate message="Connecte-toi pour gérer ton profil, ta ville et tes informations personnelles." />;
  }

  const branding = getBranding(postalCode);
  const cityRecognized = KNOWN_POSTAL_CODES.includes(postalCode.trim());

  const save = async () => {
    setMessage(null);
    const cleanPostalCode = postalCode.trim();
    if (cleanPostalCode && !/^[0-9A-Za-z -]{3,12}$/.test(cleanPostalCode)) {
      setMessage('Le code postal saisi est invalide.');
      return;
    }

    setSaving(true);
    const res = await updateProfile({
      name: name.trim() || undefined,
      postalCode: cleanPostalCode || undefined,
      city: branding.cityName,
    });
    setSaving(false);
    setMessage(res.ok ? 'Profil mis à jour.' : res.error || 'Erreur lors de la mise à jour.');
  };

  const exportData = async () => {
    setMessage(null);
    setExporting(true);
    const { data, error } = await trpcMutation<any>('privacy.exportMyData', {}, { authenticated: true });
    setExporting(false);

    if (error || !data) {
      setMessage(error || 'Impossible de générer l’export.');
      return;
    }

    try {
      await Share.share({
        title: 'Export des données VilleConnect OS',
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      setMessage('L’export a été généré, mais le partage n’a pas pu être ouvert.');
    }
  };

  const eraseAccount = () => {
    if (!password) {
      setMessage('Saisis ton mot de passe avant de continuer.');
      return;
    }
    if (deleteConfirmation !== 'SUPPRIMER') {
      setMessage('Recopie exactement SUPPRIMER pour confirmer.');
      return;
    }

    Alert.alert(
      'Supprimer définitivement le compte',
      'Les données directement identifiantes seront anonymisées et toutes les sessions seront fermées. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: async () => {
            setErasing(true);
            setMessage(null);
            const { data, error } = await trpcMutation<{ success: boolean; message: string }>(
              'privacy.eraseMyAccount',
              { password, confirmation: 'SUPPRIMER' },
              { authenticated: true }
            );
            setErasing(false);

            if (error || !data?.success) {
              setMessage(error || 'La suppression n’a pas pu être effectuée.');
              return;
            }

            await logout();
            Alert.alert('Compte supprimé', data.message, [
              { text: 'OK', onPress: () => router.replace('/login') },
            ]);
          },
        },
      ]
    );
  };

  const confirmLogout = () => {
    Alert.alert('Se déconnecter', 'Tu vas être déconnecté de ton compte.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <GlassCard style={s.card as any}>
        <View style={s.avatarWrap}>
          <LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} style={s.avatar}>
            <Text style={s.avatarLetter}>{(user.email?.[0] || '?').toUpperCase()}</Text>
          </LinearGradient>
          <Text style={s.email}>{user.email}</Text>
          <View
            style={[
              s.badge,
              {
                backgroundColor: user.emailVerified
                  ? theme.colors.badges.nouveau.bg
                  : theme.colors.badges.important.bg,
              },
            ]}
          >
            <Text
              style={{
                color: user.emailVerified ? theme.colors.success : theme.colors.warning,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {user.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
            </Text>
          </View>
        </View>

        {message ? (
          <View style={s.messageBox} accessibilityLiveRegion="polite">
            <Ionicons name="information-circle-outline" size={17} color={theme.colors.cyan} />
            <Text style={s.message}>{message}</Text>
          </View>
        ) : null}

        <Text style={s.label}>Nom affiché</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Prénom ou nom d’usage"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={128}
          autoComplete="name"
        />

        <Text style={s.label}>Ville / code postal</Text>
        <TextInput
          style={s.input}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder="7370"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="default"
          maxLength={12}
          autoComplete="postal-code"
        />
        <Text style={s.hint}>
          {cityRecognized
            ? `${branding.cityName} — ${branding.appName} actif`
            : 'Ville pas encore couverte : le branding générique VilleConnect sera utilisé.'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={save}
          disabled={saving}
          style={s.fullWidthButton}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[theme.colors.electric, theme.colors.cyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.primaryBtn}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.primaryBtnText}>Enregistrer le profil</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </GlassCard>

      <GlassCard style={[s.card, s.sectionCard] as any}>
        <View style={s.sectionHeading}>
          <View style={s.sectionIcon}>
            <Ionicons name="color-palette-outline" size={20} color={theme.colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Apparence</Text>
            <Text style={s.hint}>Le mode automatique suit les réglages de ton appareil.</Text>
          </View>
        </View>
        <View style={s.pickerWrap}>
          <ThemePicker />
          <CustomColorPicker />
        </View>
      </GlassCard>

      <GlassCard style={[s.card, s.sectionCard] as any}>
        <View style={s.sectionHeading}>
          <View style={s.sectionIcon}>
            <Ionicons name="document-lock-outline" size={20} color={theme.colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Mes données</Text>
            <Text style={s.hint}>Télécharge les informations associées à ton compte au format JSON.</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.secondaryButton}
          onPress={exportData}
          disabled={exporting}
          accessibilityRole="button"
        >
          {exporting
            ? <ActivityIndicator color={theme.colors.cyan} />
            : <Ionicons name="download-outline" size={18} color={theme.colors.cyan} />}
          <Text style={s.secondaryButtonText}>Exporter mes données</Text>
        </TouchableOpacity>
      </GlassCard>

      <GlassCard style={[s.card, s.dangerCard] as any}>
        <View style={s.sectionHeading}>
          <View style={[s.sectionIcon, s.dangerIcon]}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.dangerTitle}>Supprimer mon compte</Text>
            <Text style={s.hint}>
              Les identifiants, coordonnées et moyens de connexion seront supprimés ou anonymisés.
              Les écritures nécessaires à la sécurité et au grand livre CivicLoop peuvent être conservées sans identité directe.
            </Text>
          </View>
        </View>

        <Text style={s.label}>Mot de passe actuel</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mot de passe"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoComplete="current-password"
          maxLength={128}
        />

        <Text style={s.label}>Confirmation</Text>
        <TextInput
          style={s.input}
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          placeholder="Écrire SUPPRIMER"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          maxLength={9}
        />

        <TouchableOpacity
          style={[s.deleteButton, erasing && s.disabledButton]}
          onPress={eraseAccount}
          disabled={erasing}
          accessibilityRole="button"
        >
          {erasing
            ? <ActivityIndicator color="#FFFFFF" />
            : <Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
          <Text style={s.deleteButtonText}>Supprimer définitivement</Text>
        </TouchableOpacity>
      </GlassCard>

      <TouchableOpacity onPress={confirmLogout} style={s.logoutBtn} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
        <Text style={s.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrap: {
      flexGrow: 1,
      alignItems: 'center',
      backgroundColor: theme.colors.bgDeep,
      padding: theme.spacing.lg,
      paddingBottom: 120,
    },
    centerFull: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgDeep,
    },
    card: { width: '100%', maxWidth: 520, padding: theme.spacing.lg },
    sectionCard: { marginTop: 14 },
    avatarWrap: { alignItems: 'center', marginBottom: 18 },
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    avatarLetter: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' },
    email: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
    badge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 13,
      marginBottom: 6,
    },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '900' },
    input: {
      backgroundColor: theme.colors.surfaceSolid,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    hint: { color: theme.colors.textMuted, fontSize: 11, marginTop: 5, lineHeight: 17 },
    messageBox: {
      borderWidth: 1,
      borderColor: theme.colors.cyan + '44',
      backgroundColor: theme.colors.cyanSoft,
      borderRadius: 12,
      padding: 11,
      marginBottom: 5,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    message: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, flex: 1 },
    fullWidthButton: { width: '100%', marginTop: 18 },
    primaryBtn: { borderRadius: theme.radius.pill, paddingVertical: 14, alignItems: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.colors.cyanSoft,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '44',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerWrap: { marginTop: 14 },
    secondaryButton: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '66',
      backgroundColor: theme.colors.cyanSoft,
      borderRadius: 13,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryButtonText: { color: theme.colors.cyan, fontSize: 13, fontWeight: '800' },
    dangerCard: {
      marginTop: 14,
      borderColor: theme.colors.danger + '55',
    },
    dangerIcon: {
      backgroundColor: theme.colors.danger + '15',
      borderColor: theme.colors.danger + '55',
    },
    dangerTitle: { color: theme.colors.danger, fontSize: 15, fontWeight: '900' },
    deleteButton: {
      marginTop: 16,
      backgroundColor: theme.colors.danger,
      borderRadius: 13,
      paddingVertical: 13,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    disabledButton: { opacity: 0.55 },
    deleteButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 22,
      paddingVertical: 10,
    },
    logoutText: { color: theme.colors.danger, fontSize: 13, fontWeight: '700' },
  });
}
