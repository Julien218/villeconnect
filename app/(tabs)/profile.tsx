/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface SettingItem {
  id: string;
  title: string;
  icon: string;
  type: "toggle" | "link" | "action";
  value?: boolean;
}

export default function ProfileScreen() {
  const colors = useColors();
  const [notifications, setNotifications] = useState(true);
  const [promotions, setPromotions] = useState(true);
  const [alerts, setAlerts] = useState(true);

  const profileSections = [
    {
      title: "Notifications",
      items: [
        {
          id: "notif_general",
          title: "Notifications générales",
          icon: "bell.fill",
          type: "toggle" as const,
          value: notifications,
          onToggle: setNotifications,
        },
        {
          id: "notif_promo",
          title: "Promotions commerces",
          icon: "tag.fill",
          type: "toggle" as const,
          value: promotions,
          onToggle: setPromotions,
        },
        {
          id: "notif_alerts",
          title: "Alertes communales",
          icon: "megaphone.fill",
          type: "toggle" as const,
          value: alerts,
          onToggle: setAlerts,
        },
      ],
    },
    {
      title: "Mes activités",
      items: [
        {
          id: "my_requests",
          title: "Mes demandes DCI",
          icon: "message.fill",
          type: "link" as const,
        },
        {
          id: "my_favorites",
          title: "Mes favoris",
          icon: "heart.fill",
          type: "link" as const,
        },
        {
          id: "my_appointments",
          title: "Mes rendez-vous",
          icon: "calendar",
          type: "link" as const,
        },
      ],
    },
    {
      title: "Application",
      items: [
        {
          id: "about",
          title: "À propos de VilleConnect",
          icon: "info.circle.fill",
          type: "link" as const,
        },
        {
          id: "privacy",
          title: "Politique de confidentialité",
          icon: "doc.text.fill",
          type: "link" as const,
        },
        {
          id: "terms",
          title: "Conditions d'utilisation",
          icon: "doc.text.fill",
          type: "link" as const,
        },
        {
          id: "contact",
          title: "Nous contacter",
          icon: "paperplane.fill",
          type: "link" as const,
        },
      ],
    },
  ];

  const handleItemPress = (item: any) => {
    if (item.type === "link") {
      Alert.alert(item.title, "Cette fonctionnalité sera disponible prochainement.");
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profil</Text>
        </View>

        {/* User Card (Optional) */}
        <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol name="person.fill" size={32} color={colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>Citoyen</Text>
            <Text style={[styles.userSubtitle, { color: colors.muted }]}>
              Profil optionnel non configuré
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert("Profil", "La création de profil sera disponible prochainement.")}
          >
            <Text style={styles.editButtonText}>Configurer</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {profileSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => handleItemPress(item)}
                    disabled={item.type === "toggle"}
                    activeOpacity={item.type === "toggle" ? 1 : 0.7}
                  >
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + "15" }]}>
                      <IconSymbol name={item.icon as any} size={18} color={colors.primary} />
                    </View>
                    <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                      {item.title}
                    </Text>
                    {item.type === "toggle" && (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: colors.border, true: colors.primary + "80" }}
                        thumbColor={item.value ? colors.primary : colors.muted}
                      />
                    )}
                    {item.type === "link" && (
                      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                    )}
                  </TouchableOpacity>
                  {index < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.muted }]}>
            VilleConnect v1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: colors.muted }]}>
            La Ville Web Intelligente
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
  },
  userSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: {
    flex: 1,
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 32,
    paddingBottom: 16,
  },
  versionText: {
    fontSize: 13,
  },
  versionSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
});
