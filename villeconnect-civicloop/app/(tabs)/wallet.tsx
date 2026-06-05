/**
 * Écran Wallet CivicLoop — Ma Commune
 * © 2026 VilleConnect / JS-Innov.IA — Sprint 3
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Composant principal ──────────────────────────────────────────────────────

export default function WalletScreen() {
  const { user } = useAuth();
  const postalCode = user?.postalCode ?? '7370';
  const [tab, setTab] = useState<'missions' | 'marketplace' | 'history'>('missions');
  const [refreshing, setRefreshing] = useState(false);

  const wallet = trpc.civicloop.getWallet.useQuery(undefined, { enabled: !!user });
  const missions = trpc.civicloop.getMissionStatus.useQuery({ postalCode }, { enabled: !!user });
  const rewardsQ = trpc.civicloop.getRewards.useQuery({ postalCode });
  const claimsQ = trpc.civicloop.getMyClaims.useQuery(undefined, { enabled: !!user });
  const transactions = trpc.civicloop.getTransactions.useQuery({ limit: 30 }, { enabled: !!user });

  const completeMission = trpc.civicloop.completeMission.useMutation({
    onSuccess: (data) => {
      Alert.alert('🎉 Mission accomplie !', data.message);
      wallet.refetch();
      missions.refetch();
      transactions.refetch();
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const claimReward = trpc.civicloop.claimReward.useMutation({
    onSuccess: (data) => {
      Alert.alert('✅ Récompense réclamée !', `${data.message}\n\nCode: ${data.qrCode}`);
      wallet.refetch();
      claimsQ.refetch();
      transactions.refetch();
    },
    onError: (e) => Alert.alert('Erreur', e.message),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([wallet.refetch(), missions.refetch(), rewardsQ.refetch()]);
    setRefreshing(false);
  };

  const w = wallet.data;
  const trustScore = w?.trust_score ?? 50;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO WALLET ── */}
        <LinearGradient colors={['#1e1b4b', '#312e81', '#4338ca']} style={styles.hero}>
          <Text style={styles.heroLabel}>Mes CivicCredits</Text>
          <Text style={styles.heroBalance}>{w?.available_balance ?? 0}</Text>
          <Text style={styles.heroCurrency}>CC</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>+{w?.total_earned ?? 0}</Text>
              <Text style={styles.statLabel}>Gagnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>-{w?.total_spent ?? 0}</Text>
              <Text style={styles.statLabel}>Dépensés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{trustScore}%</Text>
              <Text style={styles.statLabel}>Trust Score</Text>
            </View>
          </View>

          {/* Trust Score bar */}
          <View style={styles.trustBarBg}>
            <View style={[styles.trustBarFill, { width: `${trustScore}%` }]} />
          </View>
        </LinearGradient>

        {/* ── TABS ── */}
        <View style={styles.tabs}>
          {(['missions', 'marketplace', 'history'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'missions' ? '🎯 Missions' : t === 'marketplace' ? '🎁 Récompenses' : '📋 Historique'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── MISSIONS ── */}
        {tab === 'missions' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Missions disponibles</Text>
            {missions.data?.map((m: any) => (
              <View key={m.id} style={[styles.card, m.completed && styles.cardDone]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{m.icon}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    <Text style={styles.cardDesc}>{m.description}</Text>
                  </View>
                  <View style={styles.rewardBadge}>
                    <Text style={styles.rewardText}>+{m.reward_amount}</Text>
                    <Text style={styles.rewardCC}>CC</Text>
                  </View>
                </View>

                {m.completed ? (
                  <View style={styles.doneTag}>
                    <Text style={styles.doneText}>✅ Complétée</Text>
                  </View>
                ) : m.validation_type === 'auto' ? (
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => completeMission.mutate({ missionId: m.id })}
                    disabled={completeMission.isLoading}
                  >
                    <Text style={styles.btnText}>Valider la mission</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.qrTag}>
                    <Text style={styles.qrText}>📱 Scan QR requis</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── MARKETPLACE ── */}
        {tab === 'marketplace' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récompenses locales</Text>
            <Text style={styles.sectionSub}>Dépensez vos CivicCredits chez les partenaires</Text>
            {rewardsQ.data?.map((r: any) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{r.icon}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{r.title}</Text>
                    <Text style={styles.cardDesc}>{r.description}</Text>
                    {r.shop_name && <Text style={styles.shopName}>📍 {r.shop_name}</Text>}
                  </View>
                  <View style={[styles.rewardBadge, { backgroundColor: '#7c3aed22' }]}>
                    <Text style={[styles.rewardText, { color: '#7c3aed' }]}>{r.cost_credits}</Text>
                    <Text style={[styles.rewardCC, { color: '#7c3aed' }]}>CC</Text>
                  </View>
                </View>

                {r.stock !== null && (
                  <Text style={styles.stock}>
                    {r.stock - r.claimed_count} restant(s)
                  </Text>
                )}

                <TouchableOpacity
                  style={[
                    styles.btn,
                    { backgroundColor: '#7c3aed' },
                    (w?.available_balance ?? 0) < r.cost_credits && styles.btnDisabled
                  ]}
                  onPress={() => {
                    if ((w?.available_balance ?? 0) < r.cost_credits) {
                      Alert.alert('Solde insuffisant', `Il vous manque ${r.cost_credits - (w?.available_balance ?? 0)} CC.`);
                      return;
                    }
                    Alert.alert(
                      'Confirmer ?',
                      `Dépenser ${r.cost_credits} CC pour "${r.title}" ?`,
                      [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Confirmer', onPress: () => claimReward.mutate({ rewardId: r.id }) }
                      ]
                    );
                  }}
                  disabled={claimReward.isLoading}
                >
                  <Text style={styles.btnText}>
                    {(w?.available_balance ?? 0) < r.cost_credits ? '🔒 Solde insuffisant' : 'Réclamer'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── HISTORIQUE ── */}
        {tab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique</Text>
            {transactions.data?.map((tx: any) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txLabel}>{tx.label}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString('fr-BE')}
                  </Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  tx.type === 'earned' || tx.type === 'bonus' ? styles.txGreen : styles.txRed
                ]}>
                  {tx.type === 'spent' ? '-' : '+'}{tx.amount} CC
                </Text>
              </View>
            ))}
            {!transactions.data?.length && (
              <Text style={styles.empty}>Aucune transaction pour le moment.</Text>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  hero: { padding: 28, paddingTop: 36, alignItems: 'center' },
  heroLabel: { color: '#a5b4fc', fontSize: 14, letterSpacing: 1, marginBottom: 8 },
  heroBalance: { color: '#fff', fontSize: 72, fontWeight: '800', lineHeight: 80 },
  heroCurrency: { color: '#818cf8', fontSize: 18, fontWeight: '600', marginBottom: 24 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { color: '#e2e8f0', fontSize: 20, fontWeight: '700' },
  statLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#4338ca' },
  trustBarBg: { width: '100%', height: 6, backgroundColor: '#312e81', borderRadius: 3 },
  trustBarFill: { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },

  tabs: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2d2d4e' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#6366f1' },

  section: { padding: 16 },
  sectionTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionSub: { color: '#64748b', fontSize: 13, marginBottom: 16 },

  card: { backgroundColor: '#1e1e3a', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardDone: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardIcon: { fontSize: 32, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  shopName: { color: '#6366f1', fontSize: 12, marginTop: 4 },
  rewardBadge: { backgroundColor: '#16a34a22', borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 52 },
  rewardText: { color: '#22c55e', fontSize: 20, fontWeight: '800' },
  rewardCC: { color: '#22c55e', fontSize: 10, fontWeight: '600' },
  stock: { color: '#f59e0b', fontSize: 12, marginBottom: 8 },

  btn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  doneTag: { backgroundColor: '#16a34a22', borderRadius: 8, padding: 8, alignItems: 'center' },
  doneText: { color: '#22c55e', fontSize: 13, fontWeight: '600' },
  qrTag: { backgroundColor: '#1e40af22', borderRadius: 8, padding: 8, alignItems: 'center' },
  qrText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },

  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' },
  txLeft: { flex: 1, marginRight: 12 },
  txLabel: { color: '#e2e8f0', fontSize: 14 },
  txDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  txGreen: { color: '#22c55e' },
  txRed: { color: '#f87171' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 32 },
});
