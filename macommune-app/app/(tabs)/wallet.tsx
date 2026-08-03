// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { trpcQuery, trpcMutation, getOpenId } from '@/shared/api-client';
import { useTheme } from '@/shared/theme-context';
import { ThemeTokens } from '@/shared/theme';
import { GlassCard } from '@/components/glass-card';
import { AuthGate } from '@/components/auth-gate';
import { useAuth } from '@/shared/auth-context';
import { LoyaltyCard } from '@/components/loyalty-card';

// Fallback utilisé UNIQUEMENT si l'API est injoignable.
const MOCK_MISSIONS = [
  { id: '1', title: 'Bienvenue dans Ma Commune !', desc: 'Complétez votre profil citoyen', points: 50, emoji: '👋' },
];
const MOCK_REWARDS = [
  { id: '1', name: 'Café offert', shop: 'Partenaire local', cost: 30, emoji: '☕' },
];

function normalizeMission(m: any) {
  return { id: String(m.id), title: m.title, desc: m.description, points: m.credits, emoji: m.icon || '🎯' };
}
function normalizeReward(r: any) {
  return { id: String(r.id), name: r.title, shop: r.merchant_name || 'Partenaire VilleConnect', cost: r.cost_credits, emoji: r.icon || '🎁' };
}

function WalletScreenContent() {
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const s = makeStyles(theme);
  const postalCode = user?.postalCode?.trim() || '7370';
  const cityName = user?.city?.trim() || 'Dour';
  const memberName = user?.name?.trim() || user?.email?.split('@')[0] || 'Citoyen';

  const [tab, setTab] = useState<'missions'|'rewards'|'history'>('missions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMock, setIsMock] = useState(false);

  const [balance, setBalance] = useState(0);
  const [earned, setEarned] = useState(0);
  const [spent, setSpent] = useState(0);
  const [trustScore, setTrustScore] = useState(0);
  const [missions, setMissions] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const openId = await getOpenId();

    // Connecté : wallet du compte réel (ctx.user.id), identique sur tous les appareils.
    // Le code postal est celui du profil actif et n'est plus figé à Dour.
    const [walletRes, missionsRes, rewardsRes, historyRes] = await Promise.all([
      isLoggedIn
        ? trpcQuery<any>('wallet.getMyWallet', {}, { authenticated: true })
        : trpcQuery<any>('wallet.getWallet', { openId, postalCode }),
      trpcQuery<any[]>('wallet.getMissions', { postalCode }),
      trpcQuery<any[]>('wallet.getRewards', { postalCode }),
      isLoggedIn
        ? trpcQuery<any[]>('wallet.getMyTransactions', { limit: 20 }, { authenticated: true })
        : trpcQuery<any[]>('wallet.getTransactions', { openId, limit: 20 }),
    ]);

    let mock = false;
    if (walletRes.data) {
      const availableBalance = Number(walletRes.data.available_balance ?? 0);
      const totalSpent = Number(walletRes.data.total_spent ?? 0);
      setBalance(availableBalance);
      setSpent(totalSpent);
      setEarned(Number(walletRes.data.total_earned ?? availableBalance + totalSpent));
      setTrustScore(Number(walletRes.data.trust_score ?? 0));
    } else {
      setBalance(0);
      setSpent(0);
      setEarned(0);
      setTrustScore(0);
      mock = true;
    }

    if (missionsRes.data) setMissions(missionsRes.data.map(normalizeMission));
    else { setMissions(MOCK_MISSIONS); mock = true; }

    if (rewardsRes.data) setRewards(rewardsRes.data.map(normalizeReward));
    else { setRewards(MOCK_REWARDS); mock = true; }

    if (historyRes.data) setHistory(historyRes.data);
    else { setHistory([]); mock = true; }

    setIsMock(mock);
    setLoading(false);
    setRefreshing(false);
  }, [isLoggedIn, postalCode]);

  useEffect(() => { load(); }, [load]);

  const completeMission = async (missionId: string) => {
    if (isMock) return;
    setCompletingId(missionId);
    const { error } = await trpcMutation(
      'wallet.completeMission',
      { missionId: Number(missionId) },
      { authenticated: true }
    );
    if (!error) {
      setDoneIds(prev => [...prev, missionId]);
      await load(true);
    }
    setCompletingId(null);
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.cyan} />}
    >
      {loading ? <ActivityIndicator color={theme.colors.cyan} style={{ marginTop: 60 }} /> : (
      <>
        <View style={s.titleBlock}>
          <Text style={s.eyebrow}>VOTRE PROGRAMME LOCAL</Text>
          <Text style={s.title}>Carte de fidélité CivicLoop</Text>
          <Text style={s.subtitle}>Votre engagement citoyen récompensé dans {cityName}.</Text>
        </View>

        <LoyaltyCard
          balance={balance}
          totalEarned={earned}
          totalSpent={spent}
          trustScore={trustScore}
          memberName={memberName}
          cityName={cityName}
          isMock={isMock}
          onOpenRewards={() => setTab('rewards')}
          onOpenHistory={() => setTab('history')}
        />

        {/* Tabs métier conservés sous la carte */}
        <View style={s.tabs}>
          {(['missions','rewards','history'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab===t && s.tabActive]}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[s.tabText, tab===t && s.tabTextActive]}>
                {t==='missions' ? '🎯 Missions' : t==='rewards' ? '🎁 Récompenses' : '📋 Historique'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* MISSIONS */}
        {tab === 'missions' && (
          missions.length === 0
            ? <Text style={s.emptyText}>Aucune mission disponible pour le moment.</Text>
            : missions.map(m => {
                const done = doneIds.includes(m.id);
                return (
                  <GlassCard key={m.id} style={[s.card, done && s.cardDone] as any}>
                    <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{m.title}</Text>
                      <Text style={s.cardDesc}>{m.desc}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={s.cardPoints}>+{m.points} CL</Text>
                      {done
                        ? <View style={s.doneBadge}><Text style={s.doneText}>✓ Fait</Text></View>
                        : (
                          <TouchableOpacity style={s.doBtn} disabled={isMock || completingId === m.id} onPress={() => completeMission(m.id)}>
                            <Text style={s.doBtnText}>{completingId === m.id ? '...' : 'Valider'}</Text>
                          </TouchableOpacity>
                        )
                      }
                    </View>
                  </GlassCard>
                );
              })
        )}

        {/* REWARDS */}
        {tab === 'rewards' && (
          rewards.length === 0
            ? <Text style={s.emptyText}>Aucune récompense disponible dans votre ville.</Text>
            : rewards.map(r => (
                <GlassCard key={r.id} style={s.card as any}>
                  <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{r.name}</Text>
                    <Text style={s.cardDesc}>{r.shop}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[s.cardPoints, { color: theme.colors.cyan }]}>{r.cost} CL</Text>
                    <TouchableOpacity style={[s.doBtn, s.doBtnDisabled]} disabled>
                      <Text style={s.doBtnText}>Bientôt</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          history.length === 0
            ? <Text style={s.emptyText}>Aucune transaction pour l'instant.</Text>
            : history.map((h, i) => (
                <GlassCard key={h.id ?? i} style={s.card as any}>
                  <View style={s.historyIcon}>
                    <Text>{h.type === 'bonus' ? '👋' : h.type === 'earned' ? '🎯' : '💸'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{h.label}</Text>
                    <Text style={s.cardDesc}>{new Date(h.created_at).toLocaleDateString('fr-BE')}</Text>
                  </View>
                  <Text style={[s.cardPoints, { color: h.type === 'spent' ? theme.colors.danger : theme.colors.success }]}>
                    {h.type === 'spent' ? '-' : '+'}{h.amount} CL
                  </Text>
                </GlassCard>
              ))
        )}
      </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen:        { flex: 1, backgroundColor: theme.colors.bgDeep },
    titleBlock:    { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 0 },
    eyebrow:       { color: theme.colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    title:         { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 5, fontFamily: theme.fonts.bold },
    subtitle:      { color: theme.colors.textSecondary, fontSize: 12, marginTop: 5 },
    tabs:          { flexDirection: 'row', marginHorizontal: 16, gap: 6, marginBottom: 10, marginTop: 4 },
    tab:           { flex: 1, backgroundColor: theme.colors.surfaceSolid, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 10, alignItems: 'center' },
    tabActive:     { backgroundColor: theme.colors.cyanSoft, borderColor: theme.colors.borderCyan },
    tabText:       { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
    tabTextActive: { color: theme.colors.cyan },
    card:          { marginHorizontal: 16, marginBottom: 10, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
    cardDone:      { opacity: 0.6 },
    cardTitle:     { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 3 },
    cardDesc:      { color: theme.colors.textSecondary, fontSize: 12 },
    cardPoints:    { color: theme.colors.warning, fontSize: 14, fontWeight: '800' },
    doneBadge:     { backgroundColor: theme.colors.badges.nouveau.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    doneText:      { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
    doBtn:         { backgroundColor: theme.colors.cyan, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    doBtnDisabled: { backgroundColor: theme.colors.textMuted },
    doBtnText:     { color: theme.mode === 'dark' ? '#04222b' : '#fff', fontSize: 12, fontWeight: '800' },
    historyIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.cyanSoft, alignItems: 'center', justifyContent: 'center' },
    emptyText:     { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 30, marginHorizontal: 24 },
  });
}

export default function WalletScreen() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgDeep }}>
        <ActivityIndicator color={theme.colors.cyan} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthGate message="Ta carte de fidélité CivicLoop, tes missions et tes récompenses sont réservées aux citoyens connectés." />;
  }

  return <WalletScreenContent />;
}
