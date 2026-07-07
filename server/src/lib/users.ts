// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { db } from '../db';

export interface ResolvedUser {
  id: number;
  role: string;
}

/**
 * Résout (ou crée) l'utilisateur numérique lié à un identifiant client (openId),
 * car civic_wallets.user_id / civic_transactions.user_id sont des clés INT (FK vers users.id)
 * alors que le client mobile/web ne connaît qu'un identifiant anonyme (UUID) stocké localement.
 * Partagé entre routers/auth.ts (émission de token) et routers/wallet.ts (lectures publiques).
 */
export async function getOrCreateUserId(openId: string, postalCode?: string): Promise<ResolvedUser> {
  const [rows] = await db.execute('SELECT id, role FROM users WHERE openId = ?', [openId]) as any[];
  const arr = rows as any[];
  if (arr.length > 0) return { id: arr[0].id, role: arr[0].role };
  await db.execute(
    `INSERT INTO users (openId, loginMethod, role, postalCode) VALUES (?, 'anonymous', 'citizen', ?)`,
    [openId, postalCode || null]
  );
  const [created] = await db.execute('SELECT id, role FROM users WHERE openId = ?', [openId]) as any[];
  return { id: (created as any[])[0].id, role: (created as any[])[0].role };
}
