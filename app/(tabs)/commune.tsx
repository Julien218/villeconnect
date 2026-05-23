/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text, View, ScrollView, TouchableOpacity,
  StyleSheet, Linking, ActivityIndicator,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/contexts/auth-context";
import { trpc } from "@/lib/trpc";
import { COMMUNAL_SERVICES, COMMUNAL_ALERTS as MOCK_ALERTS } from "@/data/mock-data";

export default function CommuneScreen() {
  const colors = useColors();
  const { postalCode, city } = useAuth();
  const [expandedAlert, setExpandedAlert] = useState<string | number | null>(null);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const { data: apiAlerts, isLoading } = trpc.communal.alerts.useQuery(
    { postalCode: postalCode ?? undefined },
    { enabled: true }
  );
  const alerts = (apiAlerts && apiAlerts.length > 0) ? apiAlerts : MOCK_ALERTS;

  const servicesByCategory = COMMUNAL_SERVICES.reduce((acc: any, s: any) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, any[]>);

  const alertTypeColor = (type: string) => {
    const map: Record<string, string> = {
      urgent: colors.error, warning: colors.accent, info: colors.primary,
    };
    return map[type] ?? colors.primary;
  };
  const alertTypeIcon = (type: string): any => {
    const map: Record<string, string> = {
      urgent: "exclamationmark.triangle.fill",
      warning: "exclamationmark.circle.fill",
      info: "info.circle.fill",
    };
    return (map[type] ?? "info.circle.fill") as any;
  };

  const s = styles(colors);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.foreground }]}>Commune</Text>
          <Text style={[s.subtitle, { color: colors.muted }]}>
            {city ? `Services de ${city}` : "Services communaux"}
          </Text>
        </View>

        {/* Carte commune */}
        <View style={[s.communeCard, { backgroundColor: colors.communal + "12", borderColor: colors.communal + "30" }]}>
          <View style={[s.communeIcon, { backgroundColor: colors.communal + "20" }]}>
            <IconSymbol name="building.columns.fill" size={28} color={colors.communal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.communeName, { color: colors.foreground }]}>
              {city ?? "Votre commune"}
            </Text>
            {postalCode && (
              <Text style={[s.communeCode, { color: colors.muted }]}>Code postal : {postalCode}</Text>
            )}
            <TouchableOpacity style={[s.rdvBtn, { backgroundColor: colors.communal }]}>
              <IconSymbol name="calendar.badge.plus" size={14} color="#fff" />
              <Text style={s.rdvText}>Prendre rendez-vous</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alertes */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>Alertes & Infos</Text>
            {isLoading && <ActivityIndicator color={colors.primary} size="small" />}
          </View>
          {(alerts as any[]).map((alert) => {
            const isExp = expandedAlert === alert.id;
            const tc = alertTypeColor(alert.type ?? "info");
            return (
              <TouchableOpacity
                key={alert.id}
                style={[s.alertCard, { backgroundColor: colors.surface, borderLeftColor: tc, borderLeftWidth: 4 }]}
                onPress={() => setExpandedAlert(isExp ? null : alert.id)}
                activeOpacity={0.8}
              >
                <View style={s.alertHead}>
                  <View style={[s.alertIconWrap, { backgroundColor: tc + "18" }]}>
                    <IconSymbol name={alertTypeIcon(alert.type ?? "info")} size={18} color={tc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.alertTitle, { color: colors.foreground }]}>{alert.title}</Text>
                    <Text style={[s.alertDate, { color: colors.muted }]}>
                      {new Date(alert.createdAt ?? alert.date ?? Date.now()).toLocaleDateString("fr-BE")}
                    </Text>
                  </View>
                  <IconSymbol name={isExp ? "chevron.up" : "chevron.down"} size={16} color={colors.muted} />
                </View>
                {isExp && (
                  <Text style={[s.alertBody, { color: colors.foreground }]}>{alert.message}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Services par catégorie */}
        {Object.entries(servicesByCategory).map(([category, services]) => (
          <View key={category} style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>{category}</Text>
            <View style={s.servicesGrid}>
              {(services as any[]).map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[s.serviceCard, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (service.phone) Linking.openURL(`tel:${service.phone}`);
                  }}
                >
                  <View style={[s.serviceIcon, { backgroundColor: colors.communal + "15" }]}>
                    <Text style={{ fontSize: 24 }}>{service.icon}</Text>
                  </View>
                  <Text style={[s.serviceTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {service.title}
                  </Text>
                  <Text style={[s.serviceDesc, { color: colors.muted }]} numberOfLines={2}>
                    {service.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Contacts utiles */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>Contacts utiles</Text>
          {[
            { label: "Urgences", number: "112", icon: "cross.fill", color: colors.error },
            { label: "Police locale", number: "101", icon: "shield.fill", color: colors.primary },
            { label: "Administration communale", number: "0800 99 100", icon: "building.columns.fill", color: colors.communal },
            { label: "Signalement voirie", number: "0800 11 901", icon: "road.lanes", color: colors.accent },
          ].map((c) => (
            <TouchableOpacity
              key={c.label}
              style={[s.contactRow, { backgroundColor: colors.surface }]}
              onPress={() => Linking.openURL(`tel:${c.number.replace(/\s/g, "")}`)}
            >
              <View style={[s.contactIcon, { backgroundColor: c.color + "15" }]}>
                <IconSymbol name={c.icon as any} size={18} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.contactLabel, { color: colors.foreground }]}>{c.label}</Text>
                <Text style={[s.contactNum, { color: colors.muted }]}>{c.number}</Text>
              </View>
              <IconSymbol name="phone.fill" size={18} color={colors.secondary} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (c: any) => StyleSheet.create({
  header:        { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title:         { fontSize: 28, fontWeight: "800" },
  subtitle:      { fontSize: 14, marginTop: 4 },
  communeCard:   { flexDirection: "row", alignItems: "flex-start", gap: 14, marginHorizontal: 16, marginBottom: 20, padding: 16, borderRadius: 16, borderWidth: 1 },
  communeIcon:   { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  communeName:   { fontSize: 20, fontWeight: "800", marginBottom: 3 },
  communeCode:   { fontSize: 13, marginBottom: 10 },
  rdvBtn:        { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 5 },
  rdvText:       { color: "#fff", fontSize: 13, fontWeight: "600" },
  section:       { marginHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionTitle:  { fontSize: 18, fontWeight: "700", flex: 1 },
  alertCard:     { borderRadius: 14, padding: 14, marginBottom: 10, gap: 0 },
  alertHead:     { flexDirection: "row", alignItems: "center", gap: 10 },
  alertIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  alertTitle:    { fontSize: 14, fontWeight: "600" },
  alertDate:     { fontSize: 11, marginTop: 1 },
  alertBody:     { fontSize: 14, lineHeight: 21, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  servicesGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard:   { width: "47%", padding: 14, borderRadius: 14, gap: 8 },
  serviceIcon:   { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serviceTitle:  { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  serviceDesc:   { fontSize: 11, lineHeight: 16 },
  contactRow:    { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  contactIcon:   { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  contactLabel:  { fontSize: 14, fontWeight: "600" },
  contactNum:    { fontSize: 13, marginTop: 1 },
});
