// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';

interface PublishedCommerce {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  address: string;
  postalCode: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  rating: number | string;
  reviewCount: number;
  hasPromotion: boolean | number;
  promotionText?: string | null;
}

const CAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  alimentation: 'basket-outline',
  santé: 'medkit-outline',
  auto: 'car-sport-outline',
  beauté: 'sparkles-outline',
  culture: 'book-outline',
  restauration: 'restaurant-outline',
  commerce: 'storefront-outline',
};

function categoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return CAT_ICON[category.trim().toLocaleLowerCase('fr-BE')] || 'storefront-outline';
}

export default function ShopsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode?.trim() || '7370';
  const cityLabel = user?.city?.trim() || 'votre ville';

  const [search, setSearch] = useState('');
  const [shops, setShops] = useState<PublishedCommerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const response = await trpcQuery<{ items: PublishedCommerce[] }>(
      'commerce.listPublished',
      { postalCode, limit: 100 }
    );

    if (response.error || !response.data) {
      setError(response.error || 'Le catalogue est momentanément indisponible.');
      setShops([]);
    } else {
      setShops(response.data.items || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [postalCode]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-BE');
    if (!query) return shops;
    return shops.filter(shop =>
      shop.name.toLocaleLowerCase('fr-BE').includes(query) ||
      shop.category.toLocaleLowerCase('fr-BE').includes(query) ||
      shop.address.toLocaleLowerCase('fr-BE').includes(query)
    );
  }, [search, shops]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={theme.colors.cyan}
        />
      }
    >
      <LinearGradient
        colors={[theme.colors.surfaceSolid, theme.colors.bgDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroGlow} />
        <View style={s.heroIcon}>
          <Ionicons name="storefront-outline" size={28} color={theme.colors.cyan} />
        </View>
        <View style={s.heroCopy}>
          <Text style={s.eyebrow}>ANNUAIRE CONNECTÉ</Text>
          <Text style={s.title}>Commerces de {cityLabel}</Text>
          <Text style={s.subtitle}>
            Uniquement les établissements vérifiés et publiés par VilleConnect OS.
          </Text>
        </View>
      </LinearGradient>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.cyan} />
        <TextInput
          style={s.searchInput}
          placeholder="Nom, catégorie ou adresse…"
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Rechercher un commerce"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.catalogMeta}>
        <Text style={s.count}>
          {filtered.length} commerce{filtered.length > 1 ? 's' : ''} · {postalCode}
        </Text>
        <View style={s.verifiedBadge}>
          <Ionicons name="shield-checkmark" size={13} color={theme.colors.cyan} />
          <Text style={s.verifiedText}>Catalogue modéré</Text>
        </View>
      </View>

      {loading && (
        <View style={s.stateBox}>
          <ActivityIndicator color={theme.colors.cyan} size="large" />
          <Text style={s.stateText}>Chargement des commerces…</Text>
        </View>
      )}

      {!loading && error && (
        <GlassCard style={s.stateCard as any}>
          <Ionicons name="cloud-offline-outline" size={34} color={theme.colors.warning} />
          <Text style={s.stateTitle}>Catalogue indisponible</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity
            style={s.retryButton}
            onPress={() => load()}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={theme.colors.bgDeep} />
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {!loading && !error && filtered.length === 0 && (
        <GlassCard style={s.stateCard as any}>
          <Ionicons name="storefront-outline" size={36} color={theme.colors.cyan} />
          <Text style={s.stateTitle}>
            {search ? 'Aucun résultat' : 'Catalogue en préparation'}
          </Text>
          <Text style={s.stateText}>
            {search
              ? 'Modifiez votre recherche pour afficher d’autres établissements.'
              : `Aucun commerce publié n’est encore disponible pour le code postal ${postalCode}.`}
          </Text>
        </GlassCard>
      )}

      {!loading && !error && filtered.map(shop => {
        const rating = Number(shop.rating) || 0;
        return (
          <TouchableOpacity
            key={shop.id}
            activeOpacity={0.82}
            onPress={() => router.push(`/commerce/${shop.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`${shop.name}, ${shop.category}, ${shop.address}`}
          >
            <GlassCard style={s.card as any}>
              <View style={s.shopIcon}>
                <Ionicons
                  name={categoryIcon(shop.category)}
                  size={25}
                  color={theme.colors.cyan}
                />
              </View>
              <View style={s.shopBody}>
                <View style={s.nameRow}>
                  <Text style={s.shopName} numberOfLines={1}>{shop.name}</Text>
                  {Boolean(shop.hasPromotion) && (
                    <View style={s.promoBadge}>
                      <Text style={s.promoText}>OFFRE</Text>
                    </View>
                  )}
                </View>
                <Text style={s.shopCat} numberOfLines={1}>
                  {shop.category}{rating > 0 ? `  ·  ★ ${rating.toFixed(1)}` : ''}
                </Text>
                <View style={s.addressRow}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={s.shopAddr} numberOfLines={2}>{shop.address}</Text>
                </View>
                {shop.promotionText ? (
                  <Text style={s.promotionLine} numberOfLines={2}>{shop.promotionText}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.cyan} />
            </GlassCard>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { paddingBottom: 120, paddingTop: 10 },
    hero: {
      marginHorizontal: 16,
      marginBottom: 14,
      minHeight: 150,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '55',
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    heroGlow: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      right: -55,
      top: -70,
      backgroundColor: theme.colors.cyan + '18',
    },
    heroIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cyan + '77',
      backgroundColor: theme.colors.cyanSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    heroCopy: { flex: 1 },
    eyebrow: { color: theme.colors.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    title: { color: theme.colors.textPrimary, fontSize: 23, fontWeight: '800', marginTop: 4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 7 },
    searchWrap: {
      marginHorizontal: 16,
      backgroundColor: theme.colors.surfaceSolid,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      gap: 10,
    },
    searchInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 14, paddingVertical: 14 },
    catalogMeta: {
      marginHorizontal: 17,
      marginVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    count: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
    verifiedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1, borderColor: theme.colors.cyan + '44',
      backgroundColor: theme.colors.cyanSoft,
      borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5,
    },
    verifiedText: { color: theme.colors.cyan, fontSize: 10, fontWeight: '700' },
    stateBox: { alignItems: 'center', paddingVertical: 38, gap: 12 },
    stateCard: {
      marginHorizontal: 16, padding: 28, alignItems: 'center', gap: 10,
    },
    stateTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '800', textAlign: 'center' },
    stateText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
    retryButton: {
      marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: theme.colors.cyan, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    retryText: { color: theme.colors.bgDeep, fontSize: 13, fontWeight: '800' },
    card: {
      marginHorizontal: 16, marginBottom: 11, padding: 16,
      flexDirection: 'row', gap: 13, alignItems: 'center',
      borderColor: theme.colors.border,
    },
    shopIcon: {
      width: 52, height: 52, borderRadius: 18,
      backgroundColor: theme.colors.cyanSoft,
      borderWidth: 1, borderColor: theme.colors.cyan + '44',
      alignItems: 'center', justifyContent: 'center',
    },
    shopBody: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    shopName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800', flexShrink: 1 },
    shopCat: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
    shopAddr: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, flex: 1 },
    promoBadge: {
      borderRadius: 6, borderWidth: 1,
      borderColor: theme.colors.warning + '55',
      backgroundColor: theme.colors.warning + '22',
      paddingHorizontal: 7, paddingVertical: 2,
    },
    promoText: { fontSize: 9, fontWeight: '900', color: theme.colors.warning },
    promotionLine: { color: theme.colors.warning, fontSize: 11, fontWeight: '700', marginTop: 6 },
  });
}
