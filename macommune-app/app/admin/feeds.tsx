// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Administration : flux d'événements (.ics) des communes et ASBL, avec synchronisation immédiate.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';

interface Feed {
  id: number;
  name: string;
  feedUrl: string;
  autoApprove: boolean;
  isActive: boolean;
  lastFetchedAt?: string | null;
  lastStatus?: 'ok' | 'error' | null;
  lastMessage?: string | null;
}

export default function AdminFeeds() {
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await trpcQuery<Feed[]>('eventFeeds.adminList', {}, { authenticated: true });
    if (error || !data) setMessage({ text: error || 'Liste indisponible.', ok: false });
    else setFeeds(data);
    setLoading(false);
  }, []);

  useEffect(() => { if (isLoggedIn) load(); else setLoading(false); }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Flux d’événements' }} /><AuthGate message="Réservé aux administrateurs." /></View>;
  }

  const add = async () => {
    setMessage(null);
    if (name.trim().length < 2 || !/^https:\/\//i.test(url.trim())) {
      setMessage({ text: 'Indiquez un nom et une adresse https:// de calendrier (.ics).', ok: false });
      return;
    }
    setBusy('new');
    const { error } = await trpcMutation('eventFeeds.adminSave', { name: name.trim(), feedUrl: url.trim(), autoApprove }, { authenticated: true });
    setBusy(null);
    if (error) setMessage({ text: error, ok: false });
    else { setName(''); setUrl(''); setAutoApprove(false); setMessage({ text: 'Flux ajouté.', ok: true }); load(); }
  };

  const syncNow = async (id: number) => {
    setBusy(id);
    const { data, error } = await trpcMutation<{ ok: boolean; message: string }>('eventFeeds.adminSyncNow', { id }, { authenticated: true });
    setBusy(null);
    if (error || !data) setMessage({ text: error || 'Synchronisation impossible.', ok: false });
    else setMessage({ text: data.message, ok: data.ok });
    load();
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Flux d’événements' }} />
      <GlassCard style={s.card as any}>
        <Text style={s.title}>Ajouter un calendrier (.ics)</Text>
        <Text style={s.muted}>
          À utiliser uniquement avec l’accord de la commune ou de l’association. Les événements importés
          restent à valider, sauf si vous activez la publication automatique.
        </Text>
        <TextInput style={s.input} value={name} onChangeText={setName} maxLength={160} placeholder="Nom (ex. Commune de Dour)" placeholderTextColor={theme.colors.textMuted} />
        <TextInput style={s.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://…/agenda.ics" placeholderTextColor={theme.colors.textMuted} />
        <View style={s.row}>
          <Text style={s.label}>Publier sans validation</Text>
          <Switch value={autoApprove} onValueChange={setAutoApprove} accessibilityLabel="Publier sans validation" />
        </View>
        <TouchableOpacity onPress={add} disabled={busy === 'new'} style={[s.btn, busy === 'new' && s.off]} accessibilityRole="button">
          <Text style={s.btnText}>Ajouter</Text>
        </TouchableOpacity>
      </GlassCard>

      {message && <Text style={message.ok ? s.okText : s.errorText} accessibilityLiveRegion="polite">{message.text}</Text>}
      {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
      {!loading && feeds.length === 0 && <Text style={s.muted}>Aucun flux enregistré.</Text>}

      {feeds.map(feed => (
        <GlassCard key={feed.id} style={s.card as any}>
          <Text style={s.title}>{feed.name}</Text>
          <Text style={s.muted} numberOfLines={2}>{feed.feedUrl}</Text>
          <Text style={feed.lastStatus === 'error' ? s.errorText : s.muted}>
            {feed.lastFetchedAt
              ? `Dernière synchronisation : ${new Date(feed.lastFetchedAt).toLocaleString('fr-BE')} — ${feed.lastMessage || ''}`
              : 'Jamais synchronisé.'}
          </Text>
          <Text style={s.muted}>{feed.autoApprove ? 'Publication automatique' : 'Validation requise'}{feed.isActive ? '' : ' · désactivé'}</Text>
          <TouchableOpacity onPress={() => syncNow(feed.id)} disabled={busy === feed.id} style={[s.btn, busy === feed.id && s.off]} accessibilityRole="button">
            {busy === feed.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>Synchroniser maintenant</Text>}
          </TouchableOpacity>
        </GlassCard>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 60, gap: 12 },
    center: { paddingVertical: 30, alignItems: 'center' },
    card: { padding: 14, gap: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    label: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    okText: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    input: {
      borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    btn: { minHeight: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    off: { opacity: 0.5 },
  });
}
