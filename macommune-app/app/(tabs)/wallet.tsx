// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const MISSIONS = [
  { id:'1', title:'Bienvenue dans DourConnect !', desc:'Complétez votre profil citoyen', points:50, done:true,  emoji:'👋' },
  { id:'2', title:'Signalement voirie',            desc:'Signalez un problème de voirie',  points:30, done:false, emoji:'🚧' },
  { id:'3', title:'Commerce local',                desc:'Visitez un commerce partenaire',  points:20, done:false, emoji:'🏪' },
  { id:'4', title:'Événement communal',            desc:'Participez à un événement',       points:40, done:false, emoji:'🎪' },
  { id:'5', title:'Entraide voisin',               desc:'Aidez un voisin via l\'appli',    points:60, done:false, emoji:'🤝' },
];

const REWARDS = [
  { id:'1', name:'Café offert',         shop:'Brasserie du Centre', cost:30, emoji:'☕' },
  { id:'2', name:'-10% Boucherie',      shop:'Boucherie Dupont',    cost:50, emoji:'🥩' },
  { id:'3', name:'Lavage voiture',      shop:'Lavage Express',      cost:80, emoji:'🚗' },
  { id:'4', name:'Bon Colruyt 5€',      shop:'Colruyt Dour',        cost:100, emoji:'🛒' },
];

export default function WalletScreen() {
  const [tab, setTab]     = useState<'missions'|'rewards'|'history'>('missions');
  const balance           = 50; // CC gagnés à l'inscription
  const trustScore        = 42;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Hero wallet */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>💎 CivicCredits</Text>
        <Text style={s.heroBalance}>{balance} CC</Text>
        <View style={s.heroRow}>
          <View style={s.heroStat}><Text style={s.heroStatNum}>{balance}</Text><Text style={s.heroStatLabel}>Gagnés</Text></View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>0</Text><Text style={s.heroStatLabel}>Dépensés</Text></View>
          <View style={s.heroStatDiv} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{trustScore}</Text><Text style={s.heroStatLabel}>Trust %</Text></View>
        </View>
        {/* Trust bar */}
        <View style={s.trustBar}>
          <View style={[s.trustFill, { width: `${trustScore}%` as any }]} />
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
      {tab === 'missions' && MISSIONS.map(m => (
        <View key={m.id} style={[s.card, m.done && s.cardDone]}>
          <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{m.title}</Text>
            <Text style={s.cardDesc}>{m.desc}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={s.cardPoints}>+{m.points} CC</Text>
            {m.done
              ? <View style={s.doneBadge}><Text style={s.doneText}>✓ Fait</Text></View>
              : <TouchableOpacity style={s.doBtn}><Text style={s.doBtnText}>Valider</Text></TouchableOpacity>
            }
          </View>
        </View>
      ))}

      {/* REWARDS */}
      {tab === 'rewards' && REWARDS.map(r => {
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
              <TouchableOpacity style={[s.doBtn, !canBuy && s.doBtnDisabled]} disabled={!canBuy}>
                <Text style={s.doBtnText}>{canBuy ? 'Acheter' : '🔒'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* HISTORY */}
      {tab === 'history' && (
        <View style={s.card}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text>👋</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Bonus bienvenue</Text>
            <Text style={s.cardDesc}>Inscription DourConnect</Text>
          </View>
          <Text style={[s.cardPoints, { color: '#10B981' }]}>+50 CC</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#0A0F1E' },
  hero:          { margin: 16, backgroundColor: '#111827', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', padding: 20 },
  heroLabel:     { color: '#7C3AED', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  heroBalance:   { color: '#F9FAFB', fontSize: 48, fontWeight: '900', marginBottom: 16 },
  heroRow:       { flexDirection: 'row', marginBottom: 16 },
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
});
