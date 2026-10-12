// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Publier une annonce : vendre, donner, prêter / louer, chercher, entraide.
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { trpcMutation } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { LISTING_KINDS, ListingKind, parseEuroToCents } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

export default function NewListing() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [kind, setKind] = useState<ListingKind>('lend');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Publier' }} /><AuthGate message="Connectez-vous pour publier une annonce." /></View>;
  }

  const needsPrice = kind === 'sell';
  const hasPrice = kind === 'sell' || kind === 'lend' || kind === 'wanted';
  const priceLabel = kind === 'lend' ? 'Prix par jour en € (vide = gratuit)' : kind === 'wanted' ? 'Budget en € (facultatif)' : 'Prix en €';

  const submit = async () => {
    setMessage(null);
    if (!user?.emailVerified) {
      setMessage({ text: 'Vérifiez votre adresse email pour publier.', ok: false });
      return;
    }
    let priceCents: number | null = null;
    if (hasPrice && price.trim()) {
      priceCents = parseEuroToCents(price);
      if (priceCents === null) { setMessage({ text: 'Prix invalide (ex. 5,00).', ok: false }); return; }
    }
    if (needsPrice && priceCents === null) { setMessage({ text: 'Indiquez un prix de vente.', ok: false }); return; }

    setBusy(true);
    const { data, error } = await trpcMutation<{ published: boolean; rejected?: boolean; message?: string | null }>(
      'community.create', { kind, title, description, priceCents }, { authenticated: true }
    );
    setBusy(false);
    if (error || !data) { setMessage({ text: error || 'Publication impossible.', ok: false }); return; }
    if (data.rejected) { setMessage({ text: data.message || 'Annonce refusée.', ok: false }); return; }
    setMessage({
      text: data.published ? 'Annonce publiée.' : 'Annonce envoyée : elle sera visible après vérification.',
      ok: true,
    });
    setTimeout(() => router.replace('/community/mine' as any), 900);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Publier une annonce' }} />
      <GlassCard style={s.card as any}>
        <View style={s.chips}>
          {LISTING_KINDS.map(item => (
            <TouchableOpacity key={item.key} onPress={() => setKind(item.key)} style={[s.chip, kind === item.key && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: kind === item.key }}>
              <Text style={[s.chipText, kind === item.key && s.chipTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.muted}>{LISTING_KINDS.find(item => item.key === kind)?.hint}</Text>

        <TextInput style={s.input} value={title} onChangeText={setTitle} maxLength={120} placeholder="Titre (ex. Échelle aluminium 3 m)" placeholderTextColor={theme.colors.textMuted} />
        <TextInput style={[s.input, s.multiline]} value={description} onChangeText={setDescription} multiline maxLength={2000} placeholder="Description, état, disponibilités…" placeholderTextColor={theme.colors.textMuted} />
        {hasPrice && (
          <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder={priceLabel} placeholderTextColor={theme.colors.textMuted} />
        )}

        <Text style={s.muted}>
          Les numéros de téléphone et adresses email sont masqués : les voisins vous écrivent via la messagerie.
          Sont interdits : armes, médicaments, animaux, produits illicites. Les annonces sont contrôlées automatiquement (IA), et les premières sont vérifiées avant publication.
        </Text>

        {message && <Text style={message.ok ? s.okText : s.errorText} accessibilityLiveRegion="polite">{message.text}</Text>}
        <TouchableOpacity onPress={submit} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>Publier</Text>}
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60 },
    card: { padding: 16, gap: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border },
    chipOn: { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.cyan },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    chipTextOn: { color: theme.colors.cyan },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    multiline: { minHeight: 110, textAlignVertical: 'top' },
    okText: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    btn: { minHeight: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    off: { opacity: 0.5 },
  });
}
