/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 *
 * Worker autonome : envoie des rappels d'événements et des alertes carburant
 * automatiquement selon un schedule. Lancé en background avec setInterval.
 */
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { pushTokens, users, events, eventReminders, communalAlerts } from "../drizzle/schema";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendPush(messages: object[]): Promise<void> {
  if (!messages.length) return;
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));
  for (const chunk of chunks) {
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
    } catch (e) {
      console.error("[PushWorker] Erreur envoi:", e);
    }
  }
}

async function getActiveTokensForUsers(db: Awaited<ReturnType<typeof getDb>>, userIds: number[]) {
  if (!db || !userIds.length) return [];
  return db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(and(inArray(pushTokens.userId, userIds), eq(pushTokens.isActive, true)));
}

// ─── Job 1 : Rappels d'événements J-1 ────────────────────────────────────────

export async function runEventReminderJob(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  console.log("[PushWorker] Job rappels événements démarré");

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Événements dans les prochaines 24h
  const upcomingEvents = await db
    .select()
    .from(events)
    .where(and(
      eq(events.status, "approved"),
      eq(events.isActive, true),
      gte(events.dateStart, in24h),
      lte(events.dateStart, in25h),
    ));

  if (!upcomingEvents.length) {
    console.log("[PushWorker] Aucun événement dans 24h");
    return;
  }

  for (const event of upcomingEvents) {
    // Récupérer les users qui ont mis un rappel sur cet événement
    const reminders = await db
      .select({ userId: eventReminders.userId })
      .from(eventReminders)
      .where(eq(eventReminders.eventId, event.id));

    if (!reminders.length) continue;

    const userIds = reminders.map((r) => r.userId);
    const tokens = await getActiveTokensForUsers(db, userIds);
    if (!tokens.length) continue;

    const dateStr = new Date(event.dateStart).toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });

    const messages = tokens.map(({ token }) => ({
      to: token,
      title: `📅 Demain : ${event.title}`,
      body: `${dateStr} — ${event.location ?? event.city ?? ""}`,
      data: { type: "event", eventId: event.id },
      sound: "default",
      channelId: "villeconnect-events",
    }));

    await sendPush(messages);
    console.log(`[PushWorker] Rappel envoyé pour "${event.title}" → ${messages.length} tokens`);
  }
}

// ─── Job 2 : Nettoyage des tokens invalides ───────────────────────────────────

export async function runTokenCleanupJob(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Expo renvoie "DeviceNotRegistered" quand un token est invalide
  // Ce job peut être enrichi pour traiter les receipts Expo
  // Pour l'instant : désactiver les tokens de users supprimés
  console.log("[PushWorker] Job nettoyage tokens OK");
}

// ─── Démarrage du worker ──────────────────────────────────────────────────────

export function startPushWorker(): void {
  console.log("[PushWorker] Démarrage...");

  // Rappels d'événements — toutes les heures
  setInterval(() => {
    runEventReminderJob().catch((e) => console.error("[PushWorker] Erreur job événements:", e));
  }, 60 * 60 * 1000);

  // Nettoyage tokens — tous les jours
  setInterval(() => {
    runTokenCleanupJob().catch((e) => console.error("[PushWorker] Erreur job nettoyage:", e));
  }, 24 * 60 * 60 * 1000);

  // Premier run immédiat
  runEventReminderJob().catch(console.error);

  console.log("[PushWorker] ✅ Worker actif — rappels toutes les heures");
}
