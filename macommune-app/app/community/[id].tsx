// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Détail d'une annonce : contacter l'auteur par la messagerie, ou signaler l'annonce.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { ListingKind, listingKindLabel, listingPriceLabel } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';

interface Detail {
  id: number;
  kind: ListingKind;
  title: string;
  description: string;
  priceCents: number | null;
  priceUnit: string | null;
  author: string;
  createdAt: string;
}

const REASONS: { key: 'forbidden' | 'scam' | 'abuse' | 'other'; label: string }[] = [
  { key: 'forbidden', label: 'Objet interdit' },
  { key: 'scam', label: 'Arnaque' },
  { key: 'abuse', label: 'Abus' },
  { key: 'other', label: 'Autre' },
];

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [item, setItem] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await trpcQuery<Detail>('community.get', { id: listingId });
    if (apiError || !data) setError(apiError || 'Annonce introuvable.'); else setItem(data);
    setLoading(false);
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  const contact = async () => {
    setMessage(null);
    if (!isLoggedIn) { router.push('/login' as any); return; }
    if (!user?.emailVerified) { setMessage({ text: 'Vérifiez votre adresse email pour écrire à un voisin.', ok: false }); return; }
    setBusy(true);
    const { data, error: apiError } = await trpcMutation<{ conversationId: number }>(
      'community.startConversation', { listingId, message: text }, { authenticated: true }
    );
    setBusy(false);
    if (apiError || !data) { setMessage({ text: apiError || 'Envoi impossible.', ok: false }); return; }
    router.replace(`/messages/${data.conversationId}` as any);
  };

  const report = async (reason: 'forbidden' | 'scam' | 'abuse' | 'other') => {
    if (!isLoggedIn) { router.push('/login' as any); return; }
    const { error: apiError } = await trpcMutation('community.report', { listingId, reason }, { authenticated: true });
    setShowReport(false);
    setMessage(apiError ? { text: apiError, ok: false } : { text: 'Merci, votre signalement a été transmis.', ok: true });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Annonce' }} />
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && error && <Text style={s.errorText}>{error}</Text>}
      {item && (
        <>
          <GlassCard style={s.card as any}>
            <Text style={s.kind}>{listingKindLabel(item.kind).toUpperCase()}</Text>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.price}>{listingPriceLabel(item.kind, item.priceCents, item.priceUnit)}</Text>
            <Text style={s.body}>{item.description}</Text>
            <Text style={s.meta}>Par {item.author} · {new Date(item.createdAt).toLocaleDateString('fr-BE')}</Text>
          </GlassCard>

          <GlassCard style={s.card as any}>
            <Text style={s.label}>Écrire à {item.author}</Text>
            <TextInput
              style={[s.input, s.multiline]} value={text} onChangeText={setText} multiline maxLength={1000}
              placeholder="Bonjour, votre annonce est-elle toujours disponible ?" placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity onPress={contact} disabled={busy} style={[s.btn, busy && s.off]} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>{isLoggedIn ? 'Envoyer le message' : 'Se connecter pour écrire'}</Text>}
            </TouchableOpacity>
            <Text style={s.muted}>
              Conseil : donnez rendez-vous dans un lieu public et ne payez jamais à l’avance un inconnu.
            </Text>
          </GlassCard>

          {message && <Text style={message.ok ? s.okText : s.errorText} accessibilityLiveRegion="polite">{message.text}</Text>}

          <TouchableOpacity onPress={() => setShowReport(v => !v)} style={s.linkBtn} accessibilityRole="button">
            <Text style={s.linkText}>Signaler cette annonce</Text>
          </TouchableOpacity>
          {showReport && (
            <View style={s.chips}>
              {REASONS.map(reason => (
                <TouchableOpacity key={reason.key} onPress={() => report(reason.key)} style={s.chip} accessibilityRole="button">
                  <Text style={s.chipText}>{reason.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 60, alignItems: 'center' },
    card: { padding: 16, gap: 10 },
    kind: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    title: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '900' },
    price: { color: theme.colors.cyan, fontSize: 16, fontWeight: '900' },
    body: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 21 },
    meta: { color: theme.colors.textMuted, fontSize: 11 },
    label: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    okText: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    btn: { minHeight: 46, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    off: { opacity: 0.5 },
    linkBtn: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
    linkText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
  });
}
