// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Conversation entre voisins : messages, envoi, blocage.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { AuthGate } from '@/components/auth-gate';

interface Msg { id: number; mine: boolean; body: string; createdAt: string }
interface Thread { title: string; other: string; otherId: number; blocked: boolean; messages: Msg[] }

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [meta, setMeta] = useState<{ title: string; other: string; otherId: number; blocked: boolean } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const scroller = useRef<ScrollView>(null);

  const poll = useCallback(async () => {
    const { data, error: apiError } = await trpcQuery<Thread>(
      'community.messages', { conversationId, afterId: lastId.current }, { authenticated: true }
    );
    if (apiError || !data) { if (lastId.current === 0) setError(apiError || 'Conversation indisponible.'); setLoading(false); return; }
    setMeta({ title: data.title, other: data.other, otherId: data.otherId, blocked: data.blocked });
    if (data.messages.length > 0) {
      lastId.current = data.messages[data.messages.length - 1].id;
      setMessages(current => [...current, ...data.messages]);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
    setError(null);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    poll();
    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [isLoggedIn, poll]);

  if (!isLoggedIn) {
    return <View style={s.screen}><Stack.Screen options={{ title: 'Conversation' }} /><AuthGate message="Connectez-vous pour voir cette conversation." /></View>;
  }

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error: apiError } = await trpcMutation('community.send', { conversationId, body: text }, { authenticated: true });
    setSending(false);
    if (apiError) { setError(apiError); return; }
    setText('');
    setError(null);
    poll();
  };

  const block = async () => {
    if (!meta) return;
    const { error: apiError } = await trpcMutation('community.block', { userId: meta.otherId }, { authenticated: true });
    if (apiError) setError(apiError); else { setMeta({ ...meta, blocked: true }); setError(null); }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: meta?.other || 'Conversation' }} />
      {meta && <Text style={s.listing} numberOfLines={1}>À propos de : {meta.title}</Text>}
      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={s.content}>
        {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
        {messages.map(message => (
          <View key={message.id} style={[s.bubble, message.mine ? s.mine : s.theirs]}>
            <Text style={message.mine ? s.mineText : s.theirsText}>{message.body}</Text>
          </View>
        ))}
        {error && <Text style={s.errorText} accessibilityLiveRegion="polite">{error}</Text>}
      </ScrollView>

      {meta?.blocked ? (
        <Text style={s.blocked}>Vous ne pouvez plus échanger avec cette personne.</Text>
      ) : (
        <View style={s.composer}>
          <TextInput style={s.input} value={text} onChangeText={setText} maxLength={1000} multiline placeholder="Votre message" placeholderTextColor={theme.colors.textMuted} />
          <TouchableOpacity onPress={send} disabled={sending || !text.trim()} style={[s.send, (sending || !text.trim()) && s.off]} accessibilityRole="button" accessibilityLabel="Envoyer">
            <Text style={s.sendText}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      )}
      {meta && !meta.blocked && (
        <TouchableOpacity onPress={block} style={s.linkBtn} accessibilityRole="button">
          <Text style={s.linkText}>Bloquer cette personne</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, gap: 8 },
    center: { paddingVertical: 40, alignItems: 'center' },
    listing: { color: theme.colors.cyan, fontSize: 11, fontWeight: '700', paddingHorizontal: 16, paddingTop: 10 },
    bubble: { maxWidth: '82%', padding: 10, borderRadius: theme.radius.md },
    mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.electric },
    theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceSolid, borderWidth: 1, borderColor: theme.colors.border },
    mineText: { color: '#FFFFFF', fontSize: 14 },
    theirsText: { color: theme.colors.textPrimary, fontSize: 14 },
    errorText: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
    composer: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-end' },
    input: {
      flex: 1, maxHeight: 110, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 10, color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    send: { minHeight: 44, paddingHorizontal: 16, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.electric },
    sendText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    off: { opacity: 0.5 },
    blocked: { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center', padding: 16 },
    linkBtn: { minHeight: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    linkText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' },
  });
}
