// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Espace organisateur (ASBL, commune, commerce) : publier un événement.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { parseDateTimeFr, parseEuroToCents } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

const CATEGORIES = ['Culture', 'Sport', 'Marché', 'Jeunesse', 'Environnement', 'Communal', 'Autre'] as const;

interface Organizer { name: string; trusted: boolean; isActive: boolean }

export default function OrganizerScreen() {
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Autre');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await trpcQuery<Organizer | null>('organizers.mine', {}, { authenticated: true });
    setOrganizer(data && data.isActive ? data : null);
    setLoading(false);
  }, []);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Organisateur' }} /><AuthGate message="Connectez-vous avec le compte de votre association ou de votre commune." /></View>;
  }

  const submit = async () => {
    setMessage(null);
    const dateStart = parseDateTimeFr(date);
    if (title.trim().length < 3 || description.trim().length < 10 || location.trim().length < 2) {
      setMessage({ text: 'Titre, description (10 caractères min.) et lieu sont obligatoires.', ok: false });
      return;
    }
    if (!dateStart) {
      setMessage({ text: 'Date invalide. Format attendu : 25/12/2026 14:30', ok: false });
      return;
    }
    let priceEuros = 0;
    if (!isFree) {
      const cents = parseEuroToCents(price);
      if (cents === null) { setMessage({ text: 'Indiquez un prix valide (ex. 5,00).', ok: false }); return; }
      priceEuros = cents / 100;
    }
    setBusy(true);
    const { data, error } = await trpcMutation<{ published: boolean }>('events.submitAsOrganizer', {
      title: title.trim(), description: description.trim(), dateStart, location: location.trim(),
      address: address.trim() || undefined, category, isFree, price: priceEuros,
    }, { authenticated: true });
    setBusy(false);
    if (error || !data) { setMessage({ text: error || 'Envoi impossible.', ok: false }); return; }
    setMessage({
      text: data.published ? 'Événement publié.' : 'Événement envoyé : il sera visible après validation.',
      ok: true,
    });
    setTitle(''); setDescription(''); setDate(''); setLocation(''); setAddress(''); setPrice('');
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Publier un événement' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && !organizer && (
        <GlassCard style={s.card as any}>
          <Text style={s.muted}>
            Ce compte n’est pas rattaché à un organisateur. Les associations et la commune peuvent demander leur activation à VilleConnect.
          </Text>
        </GlassCard>
      )}
      {organizer && (
        <GlassCard style={s.card as any}>
          <Text style={s.eyebrow}>{organizer.name.toUpperCase()}</Text>
          <Text style={s.muted}>
            {organizer.trusted
              ? 'Vos événements sont publiés immédiatement (si votre email est vérifié).'
              : 'Vos événements sont validés par VilleConnect avant publication.'}
          </Text>

          <TextInput style={s.input} value={title} onChangeText={setTitle} maxLength={190} placeholder="Titre" placeholderTextColor={theme.colors.textMuted} />
          <TextInput style={[s.input, s.multiline]} value={description} onChangeText={setDescription} multiline maxLength={5000} placeholder="Description" placeholderTextColor={theme.colors.textMuted} />
          <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="Date et heure : 25/12/2026 14:30" placeholderTextColor={theme.colors.textMuted} />
          <TextInput style={s.input} value={location} onChangeText={setLocation} maxLength={190} placeholder="Lieu (ex. Salle des fêtes)" placeholderTextColor={theme.colors.textMuted} />
          <TextInput style={s.input} value={address} onChangeText={setAddress} maxLength={255} placeholder="Adresse (facultatif)" placeholderTextColor={theme.colors.textMuted} />

          <View style={s.chips}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: category === c }}>
                <Text style={[s.chipText, category === c && s.chipTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row}>
            <Text style={s.label}>Gratuit</Text>
            <Switch value={isFree} onValueChange={setIsFree} accessibilityLabel="Événement gratuit" />
          </View>
          {!isFree && (
            <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Prix en € (ex. 5,00)" placeholderTextColor={theme.colors.textMuted} />
          )}

          {message && <Text style={message.ok ? s.okText : s.errorText} accessibilityLiveRegion="polite">{message.text}</Text>}
          <TouchableOpacity onPress={submit} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>Envoyer</Text>}
          </TouchableOpacity>
        </GlassCard>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 40, alignItems: 'center' },
    card: { padding: 16, gap: 12 },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    label: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    multiline: { minHeight: 100, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border },
    chipOn: { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.cyan },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    chipTextOn: { color: theme.colors.cyan },
    okText: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    btn: { minHeight: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    off: { opacity: 0.5 },
  });
}
