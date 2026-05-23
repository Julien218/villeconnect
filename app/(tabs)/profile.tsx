/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text, View, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth, BELGIAN_CITIES } from "@/contexts/auth-context";
import { trpc } from "@/lib/trpc";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, postalCode, city, logout, updateLocation } = useAuth();

  const [notifEvents,   setNotifEvents]   = useState(true);
  const [notifAlerts,   setNotifAlerts]   = useState(true);
  const [notifShops,    setNotifShops]    = useState(false);
  const [darkMode,      setDarkMode]      = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Changer de commune",
      "Voulez-vous choisir une autre commune ? Vos préférences locales seront réinitialisées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Changer de commune",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  const s = styles(colors);

  const SettingRow = ({ icon, label, value, onValueChange, iconColor, type = "toggle", onPress }: any) => (
    <TouchableOpacity
      style={[s.settingRow, { borderBottomColor: colors.border }]}
      onPress={type === "link" || type === "action" ? onPress : undefined}
      activeOpacity={type === "toggle" ? 1 : 0.7}
    >
      <View style={[s.settingIcon, { backgroundColor: (iconColor ?? colors.primary) + "18" }]}>
        <IconSymbol name={icon} size={18} color={iconColor ?? colors.primary} />
      </View>
      <Text style={[s.settingLabel, { color: colors.foreground }]}>{label}</Text>
      {type === "toggle" && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      )}
      {(type === "link" || type === "action") && (
        <IconSymbol name="chevron.right" size={16} color={colors.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.foreground }]}>Profil</Text>
        </View>

        {/* User card */}
        <View style={[s.userCard, { backgroundColor: colors.surface }]}>
          <View style={[s.avatar, { backgroundColor: colors.primary }]}>
            <Text style={s.avatarText}>
              {user?.name ? user.name[0].toUpperCase() : "V"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.userName, { color: colors.foreground }]}>
              {user?.name ?? "Citoyen VilleConnect"}
            </Text>
            {user?.email && (
              <Text style={[s.userEmail, { color: colors.muted }]}>{user.email}</Text>
            )}
            <View style={[s.communeBadge, { backgroundColor: colors.communal + "15" }]}>
              <IconSymbol name="location.fill" size={12} color={colors.communal} />
              <Text style={[s.communeText, { color: colors.communal }]}>
                {city ?? "Commune non définie"} {postalCode ? `(${postalCode})` : ""}
              </Text>
            </View>
          </View>
          <View style={[s.roleBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[s.roleText, { color: colors.primary }]}>
              {user?.role === "admin" ? "Admin" : user?.role === "pro" ? "Pro" : "Citoyen"}
            </Text>
          </View>
        </View>

        {/* Stats rapides */}
        <View style={[s.statsRow, { backgroundColor: colors.surface }]}>
          {[
            { label: "Demandes", value: "—", icon: "message.fill", color: colors.primary },
            { label: "Rappels", value: "—", icon: "bell.fill", color: colors.communal },
            { label: "Favoris", value: "—", icon: "heart.fill", color: colors.error },
          ].map((st) => (
            <View key={st.label} style={s.statItem}>
              <IconSymbol name={st.icon as any} size={20} color={st.color} />
              <Text style={[s.statValue, { color: colors.foreground }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: colors.muted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Notifications */}
        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>🔔 Notifications</Text>
          <SettingRow icon="calendar.badge.plus" label="Événements & activités" value={notifEvents} onValueChange={setNotifEvents} iconColor={colors.communal} />
          <SettingRow icon="exclamationmark.triangle.fill" label="Alertes communales" value={notifAlerts} onValueChange={setNotifAlerts} iconColor={colors.error} />
          <SettingRow icon="storefront.fill" label="Promotions commerces" value={notifShops} onValueChange={setNotifShops} iconColor={colors.secondary} />
        </View>

        {/* Préférences */}
        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>⚙️ Préférences</Text>
          <SettingRow
            icon="location.fill"
            label={`Ma commune : ${city ?? "Non définie"}`}
            type="action"
            iconColor={colors.primary}
            onPress={handleLogout}
          />
          <SettingRow
            icon="moon.fill"
            label="Mode sombre"
            value={darkMode}
            onValueChange={setDarkMode}
            iconColor="#7C3AED"
          />
          <SettingRow icon="globe" label="Langue" type="link" iconColor={colors.muted} onPress={() => {}} />
        </View>

        {/* Compte */}
        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>👤 Compte</Text>
          <SettingRow icon="lock.fill" label="Confidentialité" type="link" iconColor={colors.muted} onPress={() => {}} />
          <SettingRow icon="doc.text.fill" label="Conditions d'utilisation" type="link" iconColor={colors.muted} onPress={() => {}} />
          <SettingRow icon="info.circle.fill" label="À propos de VilleConnect" type="link" iconColor={colors.muted} onPress={() => {}} />
        </View>

        {/* Version */}
        <Text style={[s.version, { color: colors.muted }]}>VilleConnect v1.0.0 • © 2026 Julien Pagin</Text>

        {/* Changer de commune */}
        <TouchableOpacity style={[s.logoutBtn, { borderColor: colors.error + "40" }]} onPress={handleLogout}>
          <IconSymbol name="location.fill" size={16} color={colors.error} />
          <Text style={[s.logoutText, { color: colors.error }]}>Changer de commune</Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = (c: any) => StyleSheet.create({
  header:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title:        { fontSize: 28, fontWeight: "800" },
  userCard:     { flexDirection: "row", alignItems: "flex-start", gap: 14, marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 16 },
  avatar:       { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText:   { color: "#fff", fontSize: 26, fontWeight: "800" },
  userName:     { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  userEmail:    { fontSize: 13, marginBottom: 6 },
  communeBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  communeText:  { fontSize: 12, fontWeight: "600" },
  roleBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  roleText:     { fontSize: 11, fontWeight: "700" },
  statsRow:     { flexDirection: "row", marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 16 },
  statItem:     { flex: 1, alignItems: "center", gap: 4 },
  statValue:    { fontSize: 22, fontWeight: "800" },
  statLabel:    { fontSize: 11 },
  section:      { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  settingRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  settingIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  version:      { textAlign: "center", fontSize: 11, marginTop: 4, marginBottom: 16 },
  logoutBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  logoutText:   { fontSize: 15, fontWeight: "600" },
});
