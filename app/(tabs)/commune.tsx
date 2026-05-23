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
  Linking,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { COMMUNAL_SERVICES, COMMUNAL_ALERTS, type CommunalService, type CommunalAlert } from "@/data/mock-data";

export default function CommuneScreen() {
  const colors = useColors();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const servicesByCategory = COMMUNAL_SERVICES.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, CommunalService[]>);

  const getAlertIcon = (type: CommunalAlert["type"]) => {
    switch (type) {
      case "urgent":
        return "exclamationmark.triangle.fill" as const;
      case "warning":
        return "exclamationmark.triangle.fill" as const;
      default:
        return "info.circle.fill" as const;
    }
  };

  const getAlertColor = (type: CommunalAlert["type"]) => {
    switch (type) {
      case "urgent":
        return colors.error;
      case "warning":
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const handleServicePress = (service: CommunalService) => {
    // Simulate service actions
    switch (service.id) {
      case "cs3":
        // RDV Population
        Linking.openURL("tel:+32123456789");
        break;
      default:
        // Show info
        break;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Commune</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Services et informations officielles
          </Text>
        </View>

        {/* Alerts Section */}
        {COMMUNAL_ALERTS.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Alertes & Actualités
            </Text>
            {COMMUNAL_ALERTS.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: colors.surface,
                    borderLeftColor: getAlertColor(alert.type),
                  },
                ]}
                onPress={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                activeOpacity={0.7}
              >
                <View style={styles.alertHeader}>
                  <IconSymbol
                    name={getAlertIcon(alert.type)}
                    size={20}
                    color={getAlertColor(alert.type)}
                  />
                  <View style={styles.alertTitleContainer}>
                    <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                      {alert.title}
                    </Text>
                    <Text style={[styles.alertDate, { color: colors.muted }]}>{alert.date}</Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.muted}
                    style={{
                      transform: [{ rotate: expandedAlert === alert.id ? "90deg" : "0deg" }],
                    }}
                  />
                </View>
                {expandedAlert === alert.id && (
                  <Text style={[styles.alertMessage, { color: colors.muted }]}>
                    {alert.message}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Services by Category */}
        {Object.entries(servicesByCategory).map(([category, services]) => (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{category}</Text>
            <View style={styles.servicesGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.serviceCard, { backgroundColor: colors.surface }]}
                  onPress={() => handleServicePress(service)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: colors.communal + "20" }]}>
                    <IconSymbol
                      name={service.icon as any}
                      size={24}
                      color={colors.communal}
                    />
                  </View>
                  <Text style={[styles.serviceTitle, { color: colors.foreground }]}>
                    {service.title}
                  </Text>
                  <Text style={[styles.serviceDescription, { color: colors.muted }]} numberOfLines={2}>
                    {service.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contact</Text>
          <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
            <View style={styles.contactRow}>
              <IconSymbol name="building.columns.fill" size={20} color={colors.communal} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.muted }]}>
                  Administration communale
                </Text>
                <Text style={[styles.contactValue, { color: colors.foreground }]}>
                  Place de la Mairie, 1 - 1000 Ville
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL("tel:+32123456789")}
            >
              <IconSymbol name="phone.fill" size={20} color={colors.communal} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.muted }]}>Téléphone</Text>
                <Text style={[styles.contactValue, { color: colors.primary }]}>
                  +32 123 456 789
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.contactRow}>
              <IconSymbol name="clock.fill" size={20} color={colors.communal} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.muted }]}>Horaires</Text>
                <Text style={[styles.contactValue, { color: colors.foreground }]}>
                  Lun-Ven: 8h30-12h00, 13h30-16h30
                </Text>
              </View>
            </View>
          </View>
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
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  alertCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  alertTitleContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  alertDate: {
    fontSize: 12,
    marginTop: 2,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  serviceCard: {
    width: "48%",
    padding: 16,
    borderRadius: 14,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  contactCard: {
    borderRadius: 14,
    padding: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});
