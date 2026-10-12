// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Citoyens : tableau d'annonces entre voisins (vendre, donner, prêter, chercher, entraide).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { LISTING_KINDS, ListingKind, listingKindLabel, listingPriceLabel } from '@/shared/format';
import { GlassCard } from '@/components/glass-card';

interface Listing {
  id: number;
  kind: ListingKind;
  title: string;
  description: string;
  priceCents: number | null;
  priceUnit: string | null;
  author: string;
  createdAt: string;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode?.trim() || '7370';

  const [kind, setKind] = useState<ListingKind | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<Listing[]>('community.list', {
      postalCode, kind: kind || undefined, search: query || undefined, limit: 30,
    });
    if (apiError || !data) setError(apiError || 'Annonces indisponibles.');
    else setItems(data);
    setLoading(false);
    setRefreshing(false);
  }, [postalCode, kind, query]);

  useEffect(() => { load(); }, [load]);

  const publish = () => router.push((isLoggedIn ? '/community/new' : '/login') as any);

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
      >
        <View style={s.searchRow}>
          <TextInput
            style={s.search} value={search} onChangeText={setSearch} returnKeyType="search"
            onSubmitEditing={() => setQuery(search.trim())} maxLength={60}
            placeholder="Chercher (échelle, vélo…)" placeholderTextColor={theme.colors.textMuted}
          />
          {isLoggedIn && (
            <TouchableOpacity onPress={() => router.push('/community/mine' as any)} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Mes annonces">
              <Ionicons name="list-outline" size={20} color={theme.colors.cyan} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <TouchableOpacity onPress={() => setKind(null)} style={[s.chip, kind === null && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: kind === null }}>
            <Text style={[s.chipText, kind === null && s.chipTextOn]}>Tout</Text>
          </TouchableOpacity>
          {LISTING_KINDS.map(item => (
            <TouchableOpacity key={item.key} onPress={() => setKind(item.key)} style={[s.chip, kind === item.key && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: kind === item.key }}>
              <Text style={[s.chipText, kind === item.key && s.chipTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>}
        {!loading && error && <Text style={s.errorText}>{error}</Text>}
        {!loading && !error && items.length === 0 && (
          <GlassCard style={s.card as any}>
            <Text style={s.title}>Rien pour l’instant</Text>
            <Text style={s.muted}>Soyez le premier à publier une annonce dans votre quartier.</Text>
          </GlassCard>
        )}

        {items.map(item => (
          <TouchableOpacity key={item.id} activeOpacity={0.85} onPress={() => router.push(`/community/${item.id}` as any)} accessibilityRole="button" accessibilityLabel={item.title}>
            <GlassCard style={s.card as any}>
              <View style={s.row}>
                <Text style={s.kind}>{listingKindLabel(item.kind).toUpperCase()}</Text>
                <Text style={s.price}>{listingPriceLabel(item.kind, item.priceCents, item.priceUnit)}</Text>
              </View>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.muted} numberOfLines={2}>{item.description}</Text>
              <Text style={s.meta}>{item.author} · {new Date(item.createdAt).toLocaleDateString('fr-BE')}</Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity onPress={publish} style={s.fab} accessibilityRole="button" accessibilityLabel="Publier une annonce">
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={s.fabText}>Publier</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: 16, paddingBottom: 170, gap: 12 },
    center: { paddingVertical: 40, alignItems: 'center' },
    searchRow: { flexDirection: 'row', gap: 10 },
    search: {
      flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
      paddingHorizontal: 14, paddingVertical: 11, color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSolid, fontSize: 14,
    },
    iconBtn: {
      width: 46, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.borderCyan,
    },
    chips: { gap: 8, paddingVertical: 2 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border },
    chipOn: { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.cyan },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    chipTextOn: { color: theme.colors.cyan },
    card: { padding: 14, gap: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    kind: { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    price: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '900' },
    title: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    muted: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    meta: { color: theme.colors.textMuted, fontSize: 11 },
    errorText: { color: theme.colors.danger, fontSize: 13, fontWeight: '700' },
    fab: {
      position: 'absolute', right: 20, bottom: 110, flexDirection: 'row', alignItems: 'center', gap: 6,
      minHeight: 48, paddingHorizontal: 18, borderRadius: theme.radius.pill, backgroundColor: theme.colors.electric,
    },
    fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  });
}
