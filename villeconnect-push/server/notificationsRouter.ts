/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 */
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { pushTokens, users, communalAlerts, events } from "../drizzle/schema";

// ─── Expo Push API ────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<void> {
  if (!messages.length) return;

  // Chunker en lots de 100 (limite Expo)
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();

      // Log des erreurs par token
      if (result.data && Array.isArray(result.data)) {
        for (const ticket of result.data) {
          if (ticket.status === "error") {
            console.error("[Push] Erreur ticket:", ticket.message, ticket.details);
          }
        }
      }
    } catch (e) {
      console.error("[Push] Erreur envoi batch:", e);
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const notificationsRouter = router({

  // Enregistrer / renouveler le token push d'un utilisateur
  registerToken: protectedProcedure
    .input(z.object({
      token: z.string().min(10),
      platform: z.enum(["ios", "android", "web"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Upsert : si le token existe déjà, réactiver, sinon créer
      const existing = await db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.token, input.token))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(pushTokens)
          .set({ isActive: true, userId: ctx.user.id })
          .where(eq(pushTokens.token, input.token));
      } else {
        await db.insert(pushTokens).values({
          userId: ctx.user.id,
          token: input.token,
          platform: input.platform,
          isActive: true,
        });
      }

      return { success: true };
    }),

  // Désactiver le token (déconnexion / opt-out)
  unregisterToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await db
        .update(pushTokens)
        .set({ isActive: false })
        .where(and(
          eq(pushTokens.token, input.token),
          eq(pushTokens.userId, ctx.user.id),
        ));

      return { success: true };
    }),

  // Envoyer une alerte communale à tous les habitants d'un code postal
  sendCommunalAlert: protectedProcedure
    .input(z.object({
      postalCode: z.string().length(4),
      title: z.string().min(3).max(100),
      body: z.string().min(5).max(300),
      alertId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Seul admin/commune peut envoyer des alertes
      if (!["admin", "commune"].includes(ctx.user.role)) {
        throw new Error("Unauthorized — rôle admin ou commune requis");
      }

      // Récupérer tous les tokens actifs des habitants de ce code postal
      const usersInCity = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.postalCode, input.postalCode));

      if (!usersInCity.length) return { sent: 0 };

      const userIds = usersInCity.map((u) => u.id);

      const tokens = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(and(
          inArray(pushTokens.userId, userIds),
          eq(pushTokens.isActive, true),
        ));

      if (!tokens.length) return { sent: 0 };

      const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
        to: token,
        title: `🏘️ ${input.title}`,
        body: input.body,
        data: { type: "alert", alertId: input.alertId, postalCode: input.postalCode },
        sound: "default",
        priority: "high",
        channelId: "villeconnect-alerts",
      }));

      await sendExpoPushNotifications(messages);

      return { sent: messages.length };
    }),

  // Envoyer un rappel d'événement
  sendEventReminder: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      hoursBeforeEvent: z.number().default(24),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      if (!["admin", "commune"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      // Récupérer l'événement
      const eventRows = await db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);

      const event = eventRows[0];
      if (!event) throw new Error("Événement introuvable");

      // Tokens des habitants de la commune de l'événement
      const usersInCity = event.postalCode
        ? await db.select({ id: users.id }).from(users).where(eq(users.postalCode, event.postalCode))
        : [];

      if (!usersInCity.length) return { sent: 0 };

      const userIds = usersInCity.map((u) => u.id);
      const tokens = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(and(
          inArray(pushTokens.userId, userIds),
          eq(pushTokens.isActive, true),
        ));

      if (!tokens.length) return { sent: 0 };

      const dateStr = event.dateStart
        ? new Date(event.dateStart).toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
        : "bientôt";

      const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
        to: token,
        title: `📅 Rappel : ${event.title}`,
        body: `L'événement "${event.title}" a lieu ${dateStr} à ${event.location ?? "lieu non précisé"}.`,
        data: { type: "event", eventId: input.eventId },
        sound: "default",
        channelId: "villeconnect-events",
      }));

      await sendExpoPushNotifications(messages);

      return { sent: messages.length };
    }),

  // Notification prix carburant (déclenché automatiquement)
  sendFuelAlert: protectedProcedure
    .input(z.object({
      postalCode: z.string().length(4),
      fuelType: z.string(),
      oldPrice: z.number(),
      newPrice: z.number(),
      stationName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      if (!["admin"].includes(ctx.user.role)) {
        throw new Error("Unauthorized");
      }

      const diff = input.newPrice - input.oldPrice;
      const arrow = diff < 0 ? "📉" : "📈";
      const sign  = diff < 0 ? "" : "+";

      const usersInCity = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.postalCode, input.postalCode));

      if (!usersInCity.length) return { sent: 0 };

      const userIds = usersInCity.map((u) => u.id);
      const tokens = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(and(
          inArray(pushTokens.userId, userIds),
          eq(pushTokens.isActive, true),
        ));

      if (!tokens.length) return { sent: 0 };

      const messages: ExpoPushMessage[] = tokens.map(({ token }) => ({
        to: token,
        title: `${arrow} ${input.fuelType} : ${input.newPrice.toFixed(3)}€/L`,
        body: `Variation de ${sign}${diff.toFixed(3)}€ chez ${input.stationName}`,
        data: { type: "fuel", postalCode: input.postalCode },
        sound: "default",
        priority: "normal",
        channelId: "villeconnect-fuel",
      }));

      await sendExpoPushNotifications(messages);

      return { sent: messages.length };
    }),

  // Test : envoyer une notif à soi-même
  sendTestNotification: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const myTokens = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(and(
          eq(pushTokens.userId, ctx.user.id),
          eq(pushTokens.isActive, true),
        ));

      if (!myTokens.length) throw new Error("Aucun token enregistré pour cet utilisateur");

      await sendExpoPushNotifications(myTokens.map(({ token }) => ({
        to: token,
        title: "✅ Ma Commune — Test réussi !",
        body: "Les notifications push fonctionnent parfaitement 🎉",
        data: { type: "test" },
        sound: "default",
        channelId: "villeconnect-default",
      })));

      return { sent: myTokens.length };
    }),
});
