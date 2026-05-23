import { ENV } from "./env";
import { getDb } from "../db";
import { pushTokens, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Expo Push Notifications ──────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

/**
 * Send a push notification to a specific user's devices.
 */
export async function sendPushToUser(userId: number, message: PushMessage): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Push] DB unavailable, cannot send notification");
    return;
  }

  const tokens = await db
    .select()
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));

  if (tokens.length === 0) {
    console.log(`[Push] No active tokens for user ${userId}`);
    return;
  }

  const messages = tokens.map((t) => ({
    to: t.token,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: message.sound ?? "default",
    badge: message.badge,
  }));

  await sendExpoPush(messages);
}

/**
 * Send a push notification to ALL users in a given postal code.
 */
export async function broadcastToPostalCode(
  postalCode: string,
  message: PushMessage
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get all active tokens (we'll filter by city via join in a real impl)
  const tokens = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.isActive, true));

  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    title: message.title,
    body: message.body,
    data: { ...message.data, postalCode },
    sound: "default" as const,
  }));

  await sendExpoPush(messages);
}

/**
 * Raw Expo push sender — batches up to 100 messages per request.
 */
async function sendExpoPush(
  messages: Array<{ to: string; title: string; body: string; data?: Record<string, unknown>; sound?: string; badge?: number }>
): Promise<void> {
  const BATCH_SIZE = 100;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });
      const json = await res.json();
      console.log(`[Push] Sent batch ${Math.floor(i / BATCH_SIZE) + 1}:`, JSON.stringify(json).slice(0, 200));
    } catch (err) {
      console.error("[Push] Failed to send batch:", err);
    }
  }
}

/**
 * Notify all users about a new communal alert.
 */
export async function notifyNewAlert(alert: {
  title: string;
  message: string;
  postalCode?: string;
}): Promise<void> {
  const msg: PushMessage = {
    title: `🚨 ${alert.title}`,
    body: alert.message.slice(0, 200),
    data: { type: "alert", postalCode: alert.postalCode },
    sound: "default",
  };

  if (alert.postalCode) {
    await broadcastToPostalCode(alert.postalCode, msg);
  } else {
    // Global broadcast
    const db = await getDb();
    if (!db) return;
    const tokens = await db.select().from(pushTokens).where(eq(pushTokens.isActive, true));
    await sendExpoPush(tokens.map((t) => ({ to: t.token, ...msg })));
  }
}

/**
 * Notify users who have a reminder set for an event (24h before).
 */
export async function notifyEventReminders(eventId: number, eventTitle: string, eventDate: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // In production: query event_reminders joined with push_tokens
  console.log(`[Push] Would notify users with reminders for event ${eventId}: ${eventTitle} at ${eventDate}`);
}

/**
 * Send a push notification to the app owner (identified by OWNER_OPEN_ID).
 * Returns true if the notification was dispatched, false otherwise.
 */
export async function notifyOwner(input: { title: string; content: string }): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Push] DB unavailable, cannot notify owner");
    return false;
  }

  const ownerOpenId = ENV.ownerOpenId;
  if (!ownerOpenId) {
    console.warn("[Push] OWNER_OPEN_ID not configured");
    return false;
  }

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, ownerOpenId))
    .limit(1);

  if (!owner) {
    console.warn(`[Push] Owner user not found for openId ${ownerOpenId}`);
    return false;
  }

  try {
    await sendPushToUser(owner.id, {
      title: input.title,
      body: input.content,
      sound: "default",
    });
    return true;
  } catch (err) {
    console.error("[Push] Failed to notify owner:", err);
    return false;
  }
}
