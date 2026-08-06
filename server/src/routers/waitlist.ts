// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Liste d'attente publique
import { createHash } from 'crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';
import { checkRateLimit, logAudit } from '../lib/auth';

const PRIVACY_POLICY_VERSION = '2026-08-v1';

const ROLE_MAP: Record<string, string> = {
  citoyen: 'citoyen',
  'commerçant': 'commercant',
  commercant: 'commercant',
  organisateur: 'organisateur',
  commune: 'commune',
};

const joinInput = z.object({
  email: z.string().trim().email().max(320),
  postal_code: z.string().trim().regex(/^\d{4}$/, 'Code postal belge invalide').optional().or(z.literal('')),
  city: z.string().trim().max(128).optional(),
  role: z.enum(['citoyen', 'commerçant', 'organisateur', 'commune']).default('citoyen'),
  source: z.string().trim().max(64).optional(),
  privacyConsent: z.literal(true),
  contactFax: z.string().max(200).optional().default(''),
});

function privacyHash(value: string) {
  const salt = process.env.CITY_HASH_SALT || process.env.JWT_SECRET;
  if (!salt) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Configuration de confidentialité absente' });
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export const waitlistRouter = router({
  count: publicProcedure.query(async () => {
    const [rows] = await db.execute('SELECT COUNT(*) AS c FROM waitlist') as any[];
    return { count: Number((rows as any[])[0]?.c || 0) };
  }),

  join: publicProcedure.input(joinInput).mutation(async ({ ctx, input }) => {
    // Honeypot : réponse neutre, aucune écriture.
    if (input.contactFax.trim()) {
      return { success: true, already: false, message: 'Demande reçue.' };
    }

    const rateKey = `waitlist:${ctx.ip || 'unknown'}`;
    if (!checkRateLimit(rateKey, 8, 15 * 60 * 1000)) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives, réessayez plus tard' });
    }

    const email = input.email.toLowerCase();
    const dbRole = ROLE_MAP[input.role] || 'citoyen';
    const postalCode = input.postal_code || null;
    const city = input.city?.trim() || null;
    const source = input.source?.trim() || 'landing';
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const [existingRows] = await connection.execute(
        'SELECT id FROM waitlist WHERE email = ? FOR UPDATE',
        [email]
      ) as any[];

      let waitlistId: number;
      let already = false;
      const existing = (existingRows as any[])[0];
      if (existing) {
        waitlistId = Number(existing.id);
        already = true;
        await connection.execute(
          `UPDATE waitlist SET
             postal_code = COALESCE(?, postal_code), city = COALESCE(?, city),
             role = ?, source = ?
           WHERE id = ?`,
          [postalCode, city, dbRole, source, waitlistId]
        );
      } else {
        const [result] = await connection.execute(
          `INSERT INTO waitlist (email, postal_code, city, role, source, confirmed)
           VALUES (?, ?, ?, ?, ?, FALSE)`,
          [email, postalCode, city, dbRole, source]
        ) as any[];
        waitlistId = Number((result as any).insertId);
      }

      try {
        await connection.execute(
          `INSERT IGNORE INTO waitlist_consents
             (waitlist_id, policy_version, source, ip_hash)
           VALUES (?, ?, ?, ?)`,
          [waitlistId, PRIVACY_POLICY_VERSION, source, privacyHash(ctx.ip || 'unknown')]
        );
      } catch (error: any) {
        if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Le journal de consentement doit être installé avant les inscriptions.',
        });
      }

      const [countRows] = await connection.execute('SELECT COUNT(*) AS c FROM waitlist') as any[];
      const position = Number((countRows as any[])[0]?.c || 0);
      await connection.commit();

      await logAudit(
        null,
        'waitlist.join',
        'waitlist',
        privacyHash(email).slice(0, 16),
        { role: dbRole, source, policyVersion: PRIVACY_POLICY_VERSION },
        ctx.ip
      );

      return {
        success: true,
        already,
        position,
        message: already
          ? 'Votre inscription existante a été actualisée.'
          : `Bienvenue ! Vous êtes le n°${position} sur la liste.`,
      };
    } catch (error) {
      try { await connection.rollback(); } catch { /* déjà terminée */ }
      throw error;
    } finally {
      connection.release();
    }
  }),
});
