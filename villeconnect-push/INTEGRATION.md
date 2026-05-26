# 🔔 Push Notifications — Guide d'intégration VilleConnect

## Fichiers à copier dans ton projet

| Fichier ici | Destination dans le repo |
|---|---|
| `hooks/usePushNotifications.ts` | `hooks/usePushNotifications.ts` |
| `server/notificationsRouter.ts` | `server/notificationsRouter.ts` |
| `server/pushWorker.ts` | `server/pushWorker.ts` |
| `contexts/notifications-context.tsx` | `contexts/notifications-context.tsx` |

---

## Étape 1 — Installer expo-device

```bash
npx expo install expo-device
```

---

## Étape 2 — Ajouter le plugin expo-notifications dans app.config.ts

```ts
plugins: [
  // ... plugins existants
  [
    "expo-notifications",
    {
      icon: "./assets/images/notification-icon.png", // optionnel
      color: "#3B82F6",
      sounds: [],
    }
  ],
]
```

---

## Étape 3 — Configurer le projectId EAS dans app.config.ts

```ts
extra: {
  eas: {
    projectId: "TON_PROJECT_ID_EAS", // récupère-le sur expo.dev
  },
},
```

---

## Étape 4 — Ajouter le router notifications dans server/routers.ts

```ts
// Importer
import { notificationsRouter } from "./notificationsRouter";

// Dans appRouter
export const appRouter = router({
  auth: authRouter,
  shops: shopsRouter,
  garages: garagesRouter,
  events: eventsRouter,
  dci: dciRouter,
  commune: communeRouter,
  appointments: appointmentsRouter,
  notifications: notificationsRouter,  // ← AJOUTER ICI
  fuel: fuelRouter,
  system: systemRouter,
});
```

---

## Étape 5 — Démarrer le pushWorker dans server/index.ts

```ts
import { startPushWorker } from "./pushWorker";

// Après la connexion DB, avant de lancer le serveur :
startPushWorker();
```

---

## Étape 6 — Wrapper l'app avec NotificationsProvider

Dans `app/_layout.tsx` :

```tsx
import { NotificationsProvider } from "@/contexts/notifications-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <TRPCProvider>
        <NotificationsProvider>   {/* ← AJOUTER */}
          {/* ... reste du layout */}
        </NotificationsProvider>
      </TRPCProvider>
    </AuthProvider>
  );
}
```

---

## Étape 7 — Demander la permission au premier lancement

Dans ton écran d'onboarding (après saisie du code postal) :

```tsx
import { useNotifications } from "@/contexts/notifications-context";

const { requestPermission, permissionGranted } = useNotifications();

// Bouton "Activer les notifications"
<TouchableOpacity onPress={requestPermission}>
  <Text>🔔 Activer les notifications</Text>
</TouchableOpacity>
```

---

## Fonctionnalités disponibles

### Depuis le backend (tRPC mutations admin/commune)

| Mutation | Description |
|---|---|
| `notifications.sendCommunalAlert` | Alerte à tous les habitants d'un code postal |
| `notifications.sendEventReminder` | Rappel d'événement J-1 |
| `notifications.sendFuelAlert` | Alerte variation prix carburant |
| `notifications.sendTestNotification` | Test vers ses propres devices |

### Depuis le mobile

| Mutation | Description |
|---|---|
| `notifications.registerToken` | Enregistrer le token push |
| `notifications.unregisterToken` | Désactiver les notifs (opt-out) |

---

## Canaux Android (créés automatiquement)

| ID | Nom | Importance |
|---|---|---|
| `villeconnect-default` | Ma Commune — Général | Medium |
| `villeconnect-alerts` | Alertes communales | High |
| `villeconnect-events` | Événements locaux | Medium |
| `villeconnect-fuel` | Prix carburant | Low |

---

## Worker autonome

Le `pushWorker.ts` tourne en background dans le serveur Node :
- **Toutes les heures** : envoie les rappels J-1 aux users qui ont mis un reminder sur un événement
- **Tous les jours** : nettoyage des tokens invalides

Aucune configuration cron externe nécessaire — il s'auto-démarre avec le serveur.
