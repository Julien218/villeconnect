/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import {
  createContext, useContext, useState, useEffect,
  useRef, ReactNode
} from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, AppState } from "react-native";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationsContextValue {
  pushToken: string | null;
  permissionGranted: boolean;
  unreadCount: number;
  lastNotification: Notifications.Notification | null;
  requestPermission: () => Promise<boolean>;
  clearBadge: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// ─── Handler global (avant Provider) ─────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);

  const notifListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const registerToken = trpc.notifications.registerToken.useMutation();

  // ── Initialisation après connexion ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    initPushNotifications();

    notifListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setLastNotification(notif);
      setUnreadCount((c) => c + 1);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      setUnreadCount((c) => Math.max(0, c - 1));
      // Ici on peut router selon response.notification.request.content.data.type
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isLoggedIn]);

  // ── Réinitialisation du badge quand l'app revient au premier plan ───────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        Notifications.getBadgeCountAsync().then(setUnreadCount);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Fonctions exposées ──────────────────────────────────────────────────────

  const requestPermission = async (): Promise<boolean> => {
    if (!Device.isDevice) return false;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }

    const granted = final === "granted";
    setPermissionGranted(granted);

    if (granted) {
      await setupAndroidChannels();
      const token = await getExpoPushToken();
      if (token) {
        setPushToken(token);
        registerToken.mutate({
          token,
          platform: Platform.OS as "ios" | "android" | "web",
        });
      }
    }

    return granted;
  };

  const clearBadge = async (): Promise<void> => {
    await Notifications.setBadgeCountAsync(0);
    setUnreadCount(0);
  };

  // ── Init interne ────────────────────────────────────────────────────────────

  const initPushNotifications = async () => {
    if (!Device.isDevice) return;

    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === "granted");

    if (status === "granted") {
      await setupAndroidChannels();
      const token = await getExpoPushToken();
      if (token) {
        setPushToken(token);
        registerToken.mutate({
          token,
          platform: Platform.OS as "ios" | "android" | "web",
        });
      }
    }

    const badge = await Notifications.getBadgeCountAsync();
    setUnreadCount(badge);
  };

  return (
    <NotificationsContext.Provider value={{
      pushToken,
      permissionGranted,
      unreadCount,
      lastNotification,
      requestPermission,
      clearBadge,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans <NotificationsProvider>");
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  const channels = [
    {
      id: "villeconnect-default",
      name: "Ma Commune — Général",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3B82F6",
    },
    {
      id: "villeconnect-alerts",
      name: "Alertes communales",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#EF4444",
    },
    {
      id: "villeconnect-events",
      name: "Événements locaux",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: "#8B5CF6",
    },
    {
      id: "villeconnect-fuel",
      name: "Prix carburant",
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 100],
      lightColor: "#F59E0B",
    },
  ];

  for (const ch of channels) {
    await Notifications.setNotificationChannelAsync(ch.id, {
      name: ch.name,
      importance: ch.importance,
      vibrationPattern: ch.vibrationPattern as number[],
      lightColor: ch.lightColor,
      sound: "default",
    });
  }
}

async function getExpoPushToken(): Promise<string | null> {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn("[Push] projectId EAS manquant dans app.config.ts");
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (e) {
    console.error("[Push] Impossible d'obtenir le token:", e);
    return null;
  }
}
