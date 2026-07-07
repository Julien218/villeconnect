// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

// ── Mots de passe ────────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Access token (JWT court, 15 min) ────────────────────────────────────────
export function issueAccessToken(user: { id: number; openId: string; role: string; email_verified: boolean }): string {
  return jwt.sign(
    {
      sub: user.id,
      openId: user.openId,
      role: user.role,
      email_verified: user.email_verified,
      type: 'access',
    },
    process.env.JWT_SECRET as string,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

// ── Refresh token (opaque, jamais stocké en clair — seul le hash est en DB) ──
function randomOpaqueToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Émet un nouveau refresh token pour un utilisateur et le stocke hashé en DB. */
export async function issueRefreshToken(
  userId: number,
  meta?: { userAgent?: string; ip?: string }
): Promise<string> {
  const token = randomOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, sha256(token), meta?.userAgent || null, meta?.ip || null, expiresAt]
  );
  return token;
}

/**
 * Valide un refresh token présenté par le client, applique la rotation (l'ancien est
 * révoqué et remplacé par un nouveau), et détecte le rejeu : si un token DÉJÀ révoqué
 * est présenté à nouveau, c'est un signal de vol → toute la famille de tokens de cet
 * utilisateur est révoquée immédiatement (déconnexion forcée partout).
 */
export async function rotateRefreshToken(
  presentedToken: string,
  meta?: { userAgent?: string; ip?: string }
): Promise<{ userId: number; newRefreshToken: string } | null> {
  const hash = sha256(presentedToken);
  const [rows] = await db.execute(
    'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?',
    [hash]
  ) as any[];
  const record = (rows as any[])[0];
  if (!record) return null;

  if (record.revoked_at) {
    // Rejeu détecté — le token présenté a déjà été utilisé/révoqué auparavant.
    // On tue toute la session de cet utilisateur par précaution.
    await db.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [record.user_id]
    );
    await logAudit(record.user_id, 'refresh_reuse_detected', 'refresh_token', String(record.id));
    return null;
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return null;
  }

  const newToken = await issueRefreshToken(record.user_id, meta);
  const [newRows] = await db.execute(
    'SELECT id FROM refresh_tokens WHERE token_hash = ?', [sha256(newToken)]
  ) as any[];
  const newId = (newRows as any[])[0].id;

  await db.execute(
    'UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_id = ? WHERE id = ?',
    [newId, record.id]
  );

  return { userId: record.user_id, newRefreshToken: newToken };
}

/** Révoque un refresh token précis (logout). */
export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  await db.execute(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
    [sha256(presentedToken)]
  );
}

/** Révoque TOUS les refresh tokens d'un utilisateur (ex: après reset de mot de passe). */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db.execute(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
    [userId]
  );
}

// ── Tokens à usage unique (vérification email / reset mot de passe) ─────────
export async function createEmailVerificationToken(userId: number): Promise<string> {
  const token = randomOpaqueToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  await db.execute(
    'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, sha256(token), expiresAt]
  );
  return token;
}

export async function consumeEmailVerificationToken(presentedToken: string): Promise<number | null> {
  const hash = sha256(presentedToken);
  const [rows] = await db.execute(
    'SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = ?',
    [hash]
  ) as any[];
  const record = (rows as any[])[0];
  if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) return null;
  await db.execute('UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?', [record.id]);
  return record.user_id;
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomOpaqueToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  await db.execute(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, sha256(token), expiresAt]
  );
  return token;
}

export async function consumePasswordResetToken(presentedToken: string): Promise<number | null> {
  const hash = sha256(presentedToken);
  const [rows] = await db.execute(
    'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?',
    [hash]
  ) as any[];
  const record = (rows as any[])[0];
  if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) return null;
  await db.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [record.id]);
  return record.user_id;
}

// ── Audit log ─────────────────────────────────────────────────────────────
export async function logAudit(
  actorUserId: number | null,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, any>,
  ip?: string
): Promise<void> {
  try {
    await db.execute(
      'INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [actorUserId, action, targetType || null, targetId || null, metadata ? JSON.stringify(metadata) : null, ip || null]
    );
  } catch (e) {
    // L'audit ne doit jamais faire échouer l'action métier elle-même.
    console.error('[audit] échec écriture log:', (e as Error).message);
  }
}

// ── Rate limiting simple en mémoire (par IP) ─────────────────────────────────
// Suffisant pour une instance unique Railway. À migrer vers Redis si scaling horizontal.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}

// Nettoyage périodique pour éviter une fuite mémoire lente.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) attempts.delete(key);
  }
}, 10 * 60 * 1000).unref();

// ── Email transactionnel (Resend) ────────────────────────────────────────────
const RESEND_FROM = 'VilleConnect OS <noreply@villeconnectos.com>';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY absente — email non envoyé (sujet:', subject, ')');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[email] échec envoi (HTTP', res.status, '):', body);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] erreur réseau:', (e as Error).message);
    return false;
  }
}

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://app.villeconnectos.com';

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const link = `${WEB_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail(
    to,
    'Confirmez votre adresse email — VilleConnect OS',
    `<div style="font-family:sans-serif;max-width:480px;margin:auto">
       <h2 style="color:#0A0F1E">Bienvenue sur VilleConnect OS 👋</h2>
       <p>Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>
       <p><a href="${link}" style="background:#06B6D4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Confirmer mon email</a></p>
       <p style="color:#666;font-size:12px">Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
     </div>`
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const link = `${WEB_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail(
    to,
    'Réinitialisation de votre mot de passe — VilleConnect OS',
    `<div style="font-family:sans-serif;max-width:480px;margin:auto">
       <h2 style="color:#0A0F1E">Réinitialisation de mot de passe</h2>
       <p>Une demande de réinitialisation a été effectuée pour ce compte. Cliquez ci-dessous pour choisir un nouveau mot de passe :</p>
       <p><a href="${link}" style="background:#06B6D4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Réinitialiser mon mot de passe</a></p>
       <p style="color:#666;font-size:12px">Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
     </div>`
  );
}
