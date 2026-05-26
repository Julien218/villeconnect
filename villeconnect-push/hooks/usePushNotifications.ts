/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { useState, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { trpc } from "@/lib/trpc";

// ─── Configuration globale du handler ────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Hook principal ───────────────────────────────────────────────────────────

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const registerToken = trpc.notifications.registerToken.useMutation();

  useEffect(() => {
    // Enregistrement du token
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Envoyer au backend
        registerToken.mutate({
          token,
          platform: Platform.OS as "ios" | "android" | "web",
        });
      }
    });

    // Écouter les notifications reçues en foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
    });

    // Écouter les interactions (tap sur notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, permissionStatus, lastNotification };
}

// ─── Enregistrement du token ──────────────────────────────────────────────────

async function registerForPushNotifications(): Promise<string | null> {
  // Vérifier que c'est un vrai device (pas émulateur web)
  if (!Device.isDevice) {
    console.log("[Push] Émulateur détecté — push désactivé");
    return null;
  }

  // Permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Push] Permission refusée");
    return null;
  }

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("villeconnect-default", {
      name: "Ma Commune",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3B82F6",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("villeconnect-alerts", {
      name: "Alertes communales",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#EF4444",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("villeconnect-events", {
      name: "Événements",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: "#8B5CF6",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("villeconnect-fuel", {
      name: "Prix carburant",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: "#F59E0B",
      sound: "default",
    });
  }

  // Récupérer le token Expo Push
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("[Push] Pas de projectId EAS configuré");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.error("[Push] Erreur récupération token:", e);
    return null;
  }
}

// ─── Routing des taps de notification ────────────────────────────────────────

function handleNotificationTap(data: Record<string, unknown>) {
  // Routing selon le type de notification
  // On peut utiliser expo-router ici si besoin
  const type = data?.type as string;

  switch (type) {
    case "alert":
      // router.push("/(tabs)/commune");
      break;
    case "event":
      // router.push({ pathname: "/(tabs)/activites", params: { id: data.eventId } });
      break;
    case "fuel":
      // router.push("/(tabs)/carburant");
      break;
    case "dci":
      // router.push("/(tabs)/dci");
      break;
    default:
      break;
  }
}
