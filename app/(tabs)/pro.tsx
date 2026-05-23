/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text, View, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";

// ─── Mock stats commerçant ────────────────────────────────────────────────────

const MOCK_STATS = {
  views:       247,
  clicks:      38,
  calls:       12,
  offers:      5,
  dciReceived: 3,
  rating:      4.8,
  reviews:     42,
  convRate:    15.4,
};

const MOCK_DCI = [
  { id: 1, description: "Cherche électricien pour installation prises garage, devis urgent.", date: "2026-05-22", status: "pending" },
  { id: 2, description: "Besoin plombier pour fuite sous évier, intervention rapide souhaitée.", date: "2026-05-21", status: "pending" },
  { id: 3, description: "Recherche peintre intérieur pour 3 pièces, démarrage juin.", date: "2026-05-20", status: "responded" },
];

export default function ProDashboardScreen() {
  const colors = useColors();
  const { user, city } = useAuth();
  const [activeTab, setActiveTab] = useState<"stats" | "dci" | "promo">("stats");

  const s = styles(colors);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={[s.title, { color: colors.foreground }]}>Dashboard Pro 📊</Text>
              <Text style={[s.subtitle, { color: colors.muted }]}>
                {city ?? "Votre commune"} • Semaine en cours
              </Text>
            </View>
            <View style={[s.proBadge, { backgroundColor: colors.secondary }]}>
              <Text style={s.proBadgeText}>PRO</Text>
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}>
          {[
            { label: "Vues profil",    value: MOCK_STATS.views,    icon: "eye.fill",          color: colors.primary },
            { label: "Clics contact", value: MOCK_STATS.clicks,   icon: "cursorarrow.click", color: colors.secondary },
            { label: "Appels",        value: MOCK_STATS.calls,    icon: "phone.fill",        color: "#10B981" },
            { label: "DCI reçues",    value: MOCK_STATS.dciReceived, icon: "message.fill",   color: colors.accent },
            { label: "Note",          value: MOCK_STATS.rating,   icon: "star.fill",         color: "#F59E0B" },
          ].map(kpi => (
            <View key={kpi.label} style={[s.kpiCard, { backgroundColor: colors.surface }]}>
              <View style={[s.kpiIcon, { backgroundColor: kpi.color + "18" }]}>
                <IconSymbol name={kpi.icon as any} size={20} color={kpi.color} />
              </View>
              <Text style={[s.kpiValue, { color: colors.foreground }]}>{kpi.value}</Text>
              <Text style={[s.kpiLabel, { color: colors.muted }]}>{kpi.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={[s.tabs, { backgroundColor: colors.surface }]}>
          {[
            { key: "stats", label: "📈 Stats" },
            { key: "dci",   label: "💬 DCI" },
            { key: "promo", label: "🎁 Promo" },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[s.tabText, { color: activeTab === tab.key ? "#fff" : colors.muted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <View style={s.section}>
            {/* Taux de conversion */}
            <View style={[s.convCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.convTitle, { color: colors.foreground }]}>Taux de conversion</Text>
              <View style={s.convRow}>
                <Text style={[s.convValue, { color: colors.primary }]}>{MOCK_STATS.convRate}%</Text>
                <View style={[s.convBar, { backgroundColor: colors.border }]}>
                  <View style={[s.convFill, { backgroundColor: colors.primary, width: `${MOCK_STATS.convRate}%` }]} />
                </View>
              </View>
              <Text style={[s.convSub, { color: colors.muted }]}>
                {MOCK_STATS.clicks} clics → {MOCK_STATS.calls} appels cette semaine
              </Text>
            </View>

            {/* Avis */}
            <View style={[s.reviewCard, { backgroundColor: colors.surface }]}>
              <View style={s.reviewTop}>
                <Text style={[s.convTitle, { color: colors.foreground }]}>Avis clients</Text>
                <View style={[s.starBadge, { backgroundColor: "#F59E0B18" }]}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                  <Text style={[s.starVal, { color: "#F59E0B" }]}>{MOCK_STATS.rating}</Text>
                </View>
              </View>
              <Text style={[s.convSub, { color: colors.muted }]}>
                Basé sur {MOCK_STATS.reviews} avis vérifiés
              </Text>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[s.actionBtnText, { color: colors.primary }]}>Voir tous les avis →</Text>
              </TouchableOpacity>
            </View>

            {/* Conseil IA */}
            <View style={[s.aiTip, { backgroundColor: colors.secondary + "12", borderColor: colors.secondary + "30" }]}>
              <Text style={{ fontSize: 22 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.aiTipTitle, { color: colors.foreground }]}>Conseil IA</Text>
                <Text style={[s.aiTipText, { color: colors.muted }]}>
                  Vos vues ont augmenté de 23% cette semaine. Répondez aux 2 DCI en attente pour booster votre visibilité et décrocher de nouveaux clients.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* DCI Tab */}
        {activeTab === "dci" && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>
              Demandes citoyennes ({MOCK_DCI.filter(d => d.status === "pending").length} nouvelles)
            </Text>
            {MOCK_DCI.map(dci => (
              <View key={dci.id} style={[s.dciCard, { backgroundColor: colors.surface }]}>
                <View style={s.dciTop}>
                  <View style={[s.dciStatus, { backgroundColor: dci.status === "pending" ? colors.accent + "20" : colors.secondary + "20" }]}>
                    <Text style={[s.dciStatusText, { color: dci.status === "pending" ? colors.accent : colors.secondary }]}>
                      {dci.status === "pending" ? "🔔 Nouveau" : "✅ Répondu"}
                    </Text>
                  </View>
                  <Text style={[s.dciDate, { color: colors.muted }]}>{dci.date}</Text>
                </View>
                <Text style={[s.dciDesc, { color: colors.foreground }]} numberOfLines={2}>{dci.description}</Text>
                {dci.status === "pending" && (
                  <TouchableOpacity style={[s.replyBtn, { backgroundColor: colors.primary }]}>
                    <IconSymbol name="paperplane.fill" size={14} color="#fff" />
                    <Text style={s.replyBtnText}>Envoyer une offre</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Promo Tab */}
        {activeTab === "promo" && (
          <View style={s.section}>
            <View style={[s.promoCard, { backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 36, textAlign: "center" }}>🎁</Text>
              <Text style={[s.promoTitle, { color: colors.foreground }]}>Créer une promotion</Text>
              <Text style={[s.promoSub, { color: colors.muted }]}>
                Publiez une offre spéciale visible par tous les citoyens de {city ?? "votre commune"}.
              </Text>
              <TouchableOpacity style={[s.promoBtn, { backgroundColor: colors.secondary }]}>
                <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
                <Text style={s.promoBtnText}>Nouvelle promotion</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.aiTip, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
              <Text style={{ fontSize: 22 }}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.aiTipTitle, { color: colors.foreground }]}>IA Marketing</Text>
                <Text style={[s.aiTipText, { color: colors.muted }]}>
                  Bientôt disponible : génération automatique de promotions et posts réseaux sociaux basés sur vos performances.
                </Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (c: any) => StyleSheet.create({
  header:        { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title:         { fontSize: 26, fontWeight: "800" },
  subtitle:      { fontSize: 13, marginTop: 4 },
  proBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  proBadgeText:  { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  kpiCard:       { width: 110, padding: 14, borderRadius: 16, alignItems: "center", gap: 6 },
  kpiIcon:       { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kpiValue:      { fontSize: 22, fontWeight: "800" },
  kpiLabel:      { fontSize: 11, textAlign: "center" },
  tabs:          { flexDirection: "row", marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderRadius: 14, padding: 4, gap: 4 },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabText:       { fontSize: 13, fontWeight: "600" },
  section:       { padding: 16, gap: 12 },
  sectionTitle:  { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  convCard:      { padding: 16, borderRadius: 16, gap: 8 },
  convTitle:     { fontSize: 15, fontWeight: "700" },
  convRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  convValue:     { fontSize: 28, fontWeight: "800", width: 60 },
  convBar:       { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  convFill:      { height: 8, borderRadius: 4 },
  convSub:       { fontSize: 12 },
  reviewCard:    { padding: 16, borderRadius: 16, gap: 8 },
  reviewTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  starBadge:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  starVal:       { fontSize: 16, fontWeight: "800" },
  actionBtn:     { paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  aiTip:         { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start" },
  aiTipTitle:    { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  aiTipText:     { fontSize: 12, lineHeight: 18 },
  dciCard:       { padding: 14, borderRadius: 14, gap: 8 },
  dciTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dciStatus:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dciStatusText: { fontSize: 12, fontWeight: "600" },
  dciDate:       { fontSize: 11 },
  dciDesc:       { fontSize: 14, lineHeight: 20 },
  replyBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  replyBtnText:  { color: "#fff", fontSize: 13, fontWeight: "600" },
  promoCard:     { padding: 20, borderRadius: 16, alignItems: "center", gap: 10 },
  promoTitle:    { fontSize: 18, fontWeight: "700" },
  promoSub:      { fontSize: 13, textAlign: "center", lineHeight: 19 },
  promoBtn:      { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  promoBtnText:  { color: "#fff", fontSize: 15, fontWeight: "700" },
});
