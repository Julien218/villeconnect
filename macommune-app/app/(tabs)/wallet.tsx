// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { trpcQuery, trpcMutation, getOpenId } from '@/shared/api-client';

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

export default function WalletScreen() {
  const [tab, setTab] = useState<'missions'|'rewards'|'history'>('missions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [balance, setBalance] = useState(0);
  const [spent, setSpent] = useState(0);
  const [trustScore, setTrustScore] = useState(0);
  const [missions, setMissions] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const id = await getOpenId();
    setOpenId(id);

    const [walletRes, missionsRes, rewardsRes, historyRes] = await Promise.all([
      trpcQuery<any>('wallet.getWallet', { openId: id, postalCode: '7370' }),
      trpcQuery<any[]>('wallet.getMissions', { postalCode: '7370' }),
      trpcQuery<any[]>('wallet.getRewards', { postalCode: '7370' }),
      trpcQuery<any[]>('wallet.getTransactions', { openId: id, limit: 20 }),
    ]);

    let mock = false;
    if (walletRes.data) {
      setBalance(walletRes.data.available_balance ?? 0);
      setSpent(walletRes.data.total_spent ?? 0);
      setTrustScore(walletRes.data.trust_score ?? 0);
    } else mock = true;

    if (missionsRes.data && missionsRes.data.length > 0) setMissions(missionsRes.data.map(normalizeMission));
    else { setMissions(MOCK_MISSIONS); mock = true; }

    if (rewardsRes.data && rewardsRes.data.length > 0) setRewards(rewardsRes.data.map(normalizeReward));
    else { setRewards(MOCK_REWARDS); mock = true; }

    if (historyRes.data) setHistory(historyRes.data);

    setIsMock(mock);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const completeMission = async (missionId: string, points: number) => {
    if (!openId || isMock) return;
    setCompletingId(missionId);
    const { error } = await trpcMutation('wallet.completeMission', { openId, missionId: Number(missionId), credits: points });
    if (!error) {
      setDoneIds(prev => [...prev, missionId]);
      await load(true);
    }
    setCompletingId(null);
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7C3AED" />}
    >
      {loading ? <ActivityIndicator color="#7C3AED" style={{ marginTop: 60 }} /> : (
      <>
      {/* Hero wallet */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>💎 CivicCredits</Text>
        <Text style={s.heroBalance}>{balance} CC</Text>
        {isMock && <Text style={s.mockBadge}>⚠️ Données hors-ligne (démo)</Text>}
        <View style={s.heroRow}>
          <View style={s.heroStat}><Text style={s.heroStatNum}>{balance + spent}</Text><Text style={s.heroStatLabel}>Gagnés</Text></View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{spent}</Text><Text style={s.heroStatLabel}>Dépensés</Text></View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{trustScore}</Text><Text style={s.heroStatLabel}>Trust %</Text></View>
        </View>
        <View style={s.trustBar}>
          <View style={[s.trustFill, { width: `${Math.min(100, trustScore)}%` as any }]} />
        </View>
        <Text style={s.trustLabel}>Score de confiance citoyen : {trustScore}/100</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['missions','rewards','history'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>
              {t==='missions' ? '🎯 Missions' : t==='rewards' ? '🎁 Récompenses' : '📋 Historique'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* MISSIONS */}
      {tab === 'missions' && missions.map(m => {
        const done = doneIds.includes(m.id);
        return (
          <View key={m.id} style={[s.card, done && s.cardDone]}>
            <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{m.title}</Text>
              <Text style={s.cardDesc}>{m.desc}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={s.cardPoints}>+{m.points} CC</Text>
              {done
                ? <View style={s.doneBadge}><Text style={s.doneText}>✓ Fait</Text></View>
                : (
                  <TouchableOpacity style={s.doBtn} disabled={isMock || completingId === m.id} onPress={() => completeMission(m.id, m.points)}>
                    <Text style={s.doBtnText}>{completingId === m.id ? '...' : 'Valider'}</Text>
                  </TouchableOpacity>
                )
              }
            </View>
          </View>
        );
      })}

      {/* REWARDS */}
      {tab === 'rewards' && rewards.map(r => {
        const canBuy = balance >= r.cost;
        return (
          <View key={r.id} style={s.card}>
            <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{r.name}</Text>
              <Text style={s.cardDesc}>{r.shop}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[s.cardPoints, { color: '#7C3AED' }]}>{r.cost} CC</Text>
              <TouchableOpacity style={[s.doBtn, s.doBtnDisabled]} disabled>
                <Text style={s.doBtnText}>Bientôt</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* HISTORY */}
      {tab === 'history' && (
        history.length === 0
          ? <Text style={s.emptyText}>Aucune transaction pour l'instant.</Text>
          : history.map((h, i) => (
            <View key={h.id ?? i} style={s.card}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text>{h.type === 'bonus' ? '👋' : h.type === 'earned' ? '🎯' : '💸'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{h.label}</Text>
                <Text style={s.cardDesc}>{new Date(h.created_at).toLocaleDateString('fr-BE')}</Text>
              </View>
              <Text style={[s.cardPoints, { color: h.type === 'spent' ? '#EF4444' : '#10B981' }]}>
                {h.type === 'spent' ? '-' : '+'}{h.amount} CC
              </Text>
            </View>
          ))
      )}
      </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#0A0F1E' },
  hero:          { margin: 16, backgroundColor: '#111827', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', padding: 20 },
  heroLabel:     { color: '#7C3AED', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  heroBalance:   { color: '#F9FAFB', fontSize: 48, fontWeight: '900', marginBottom: 8 },
  mockBadge:     { color: '#F59E0B', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  heroRow:       { flexDirection: 'row', marginBottom: 16, marginTop: 8 },
  heroStat:      { flex: 1, alignItems: 'center' },
  heroStatNum:   { color: '#F9FAFB', fontSize: 20, fontWeight: '900' },
  heroStatLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroStatDiv:   { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  trustBar:      { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  trustFill:     { height: '100%', backgroundColor: '#7C3AED', borderRadius: 3 },
  trustLabel:    { color: '#9CA3AF', fontSize: 11 },
  tabs:          { flexDirection: 'row', marginHorizontal: 16, gap: 6, marginBottom: 8 },
  tab:           { flex: 1, backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 9, alignItems: 'center' },
  tabActive:     { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  tabText:       { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#10B981' },
  card:          { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardDone:      { opacity: 0.6 },
  cardTitle:     { color: '#F9FAFB', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  cardDesc:      { color: '#9CA3AF', fontSize: 12 },
  cardPoints:    { color: '#F59E0B', fontSize: 14, fontWeight: '800' },
  doneBadge:     { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  doneText:      { color: '#10B981', fontSize: 11, fontWeight: '700' },
  doBtn:         { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  doBtnDisabled: { backgroundColor: '#374151' },
  doBtnText:     { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyText:     { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 30 },
});
