// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { GlassCard } from '@/components/glass-card';
import { trpcMutation, trpcQuery } from '@/shared/api-client';
import { useAuth } from '@/shared/auth-context';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';

type Commerce = {
  id: number; name: string; category: string; address: string; postal_code: string; city: string;
  source: string; validation_status: 'pending' | 'approved' | 'rejected';
  publication_status: 'draft' | 'published' | 'suspended' | 'archived'; created_at: string;
};

export default function AdminCommercesScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const [items, setItems] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowed = !!user && ['admin', 'super_admin'].includes(user.role);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    const { data, error: apiError } = await trpcQuery<Commerce[]>('commerce.listForReview', { limit: 100 }, { authenticated: true });
    setItems(data || []); setError(apiError); setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { if (allowed) load(); else setLoading(false); }, [allowed, load]);

  const review = async (item: Commerce, validationStatus: 'approved' | 'rejected') => {
    setBusyId(item.id);
    const { error: apiError } = await trpcMutation('commerce.review', {
      id: item.id, validationStatus, publish: validationStatus === 'approved',
    }, { authenticated: true });
    setBusyId(null);
    if (apiError) return Alert.alert('Action impossible', apiError);
    await load();
  };

  if (authLoading) return <View style={s.center}><ActivityIndicator color={theme.colors.cyan} /></View>;
  if (!allowed) return <View style={s.center}><Text style={s.title}>Accès refusé</Text><Text style={s.muted}>Cette section est réservée aux administrateurs VilleConnect.</Text><TouchableOpacity onPress={() => router.back()}><Text style={s.link}>Retour</Text></TouchableOpacity></View>;

  return <ScrollView style={s.screen} contentContainerStyle={s.wrap} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}>
    <Text style={s.kicker}>VILLECONNECT OS</Text><Text style={s.title}>Validation des commerces</Text>
    <Text style={s.muted}>{items.filter(x => x.validation_status === 'pending').length} demande(s) en attente · seules les fiches approuvées sont publiées.</Text>
    {error ? <Text style={s.error}>{error}</Text> : null}
    {loading ? <ActivityIndicator color={theme.colors.cyan} style={{ marginTop: 28 }} /> : null}
    {!loading && items.length === 0 ? <Text style={s.empty}>Aucune demande à traiter.</Text> : null}
    {items.map(item => <GlassCard key={item.id} style={s.card}>
      <View style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.category}>{item.category} · {item.source}</Text></View><View style={[s.badge, item.validation_status === 'approved' ? s.approved : item.validation_status === 'rejected' ? s.rejected : s.pending]}><Text style={s.badgeText}>{item.validation_status}</Text></View></View>
      <Text style={s.address}>{item.address}, {item.postal_code} {item.city}</Text>
      <Text style={s.status}>Publication : {item.publication_status}</Text>
      <View style={s.actions}>
        <TouchableOpacity disabled={busyId === item.id} onPress={() => review(item, 'approved')} style={{ flex: 1 }}><LinearGradient colors={[theme.colors.electric, theme.colors.cyan]} style={s.primary}><Text style={s.primaryText}>{busyId === item.id ? 'Traitement…' : 'Valider et publier'}</Text></LinearGradient></TouchableOpacity>
        <TouchableOpacity disabled={busyId === item.id} onPress={() => review(item, 'rejected')} style={s.secondary}><Text style={s.rejectText}>Rejeter</Text></TouchableOpacity>
      </View>
    </GlassCard>)}
  </ScrollView>;
}

function makeStyles(theme: ThemeTokens) { return StyleSheet.create({
  screen:{flex:1,backgroundColor:theme.colors.bgDeep},wrap:{padding:20,paddingBottom:80},center:{flex:1,backgroundColor:theme.colors.bgDeep,alignItems:'center',justifyContent:'center',padding:28,gap:14},
  kicker:{color:theme.colors.cyan,fontSize:11,fontWeight:'800',letterSpacing:1.5},title:{color:theme.colors.textPrimary,fontSize:28,fontWeight:'900',fontFamily:theme.fonts.bold,marginTop:5},muted:{color:theme.colors.textMuted,fontSize:12,lineHeight:18,marginTop:7},link:{color:theme.colors.cyan,fontWeight:'800'},error:{color:theme.colors.danger,marginTop:14},empty:{color:theme.colors.textSecondary,textAlign:'center',marginTop:36},
  card:{padding:18,marginTop:14},row:{flexDirection:'row',alignItems:'center',gap:10},name:{color:theme.colors.textPrimary,fontSize:17,fontWeight:'800'},category:{color:theme.colors.cyan,fontSize:11,marginTop:3},address:{color:theme.colors.textSecondary,fontSize:12,marginTop:14},status:{color:theme.colors.textMuted,fontSize:11,marginTop:5},badge:{borderRadius:999,paddingHorizontal:9,paddingVertical:4},pending:{backgroundColor:theme.colors.warning+'22'},approved:{backgroundColor:theme.colors.success+'22'},rejected:{backgroundColor:theme.colors.danger+'22'},badgeText:{color:theme.colors.textPrimary,fontSize:10,fontWeight:'800'},
  actions:{flexDirection:'row',gap:10,marginTop:16},primary:{paddingVertical:12,paddingHorizontal:14,borderRadius:999,alignItems:'center'},primaryText:{color:'#fff',fontSize:11,fontWeight:'800'},secondary:{paddingHorizontal:16,borderRadius:999,borderWidth:1,borderColor:theme.colors.danger+'77',alignItems:'center',justifyContent:'center'},rejectText:{color:theme.colors.danger,fontSize:11,fontWeight:'800'},
}); }

