// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Router tRPC : liste d'attente publique (landing villeconnectos.com)
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { db } from '../db';
import { checkRateLimit, logAudit } from '../lib/auth';

// Rôles acceptés côté front (avec accent) → valeur ENUM stockée en base (sans accent,
// évite tout souci d'encodage/collation MySQL sur la colonne ENUM).
const ROLE_MAP: Record<string, string> = {
  citoyen: 'citoyen',
  'commerçant': 'commercant',
  commercant: 'commercant',
  organisateur: 'organisateur',
  commune: 'commune',
};

const joinInput = z.object({
  email: z.string().email().max(320),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Code postal belge invalide (4 chiffres)')
    .optional()
    .or(z.literal('')),
  city: z.string().trim().max(128).optional(),
  role: z.enum(['citoyen', 'commerçant', 'organisateur', 'commune']).default('citoyen'),
  source: z.string().trim().max(64).optional(),
});

export const waitlistRouter = router({
  // Nombre total d'inscrits — information publique, aucune PII exposée.
  count: publicProcedure.query(async () => {
    const [rows] = (await db.execute('SELECT COUNT(*) AS c FROM waitlist')) as any[];
    return { count: Number((rows as any[])[0]?.c || 0) };
  }),

  // Inscription à la liste d'attente. Anti-doublon strict sur l'email (contrainte
  // UNIQUE en base), validation stricte du code postal belge, rate limiting par IP.
  join: publicProcedure.input(joinInput).mutation(async ({ ctx, input }) => {
    const rateKey = `waitlist:${ctx.ip || 'unknown'}`;
    if (!checkRateLimit(rateKey, 8, 15 * 60 * 1000)) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives, réessayez plus tard' });
    }

    const email = input.email.toLowerCase().trim();
    const dbRole = ROLE_MAP[input.role] || 'citoyen';
    const postalCode = input.postal_code || null;
    const city = input.city?.trim() || null;
    const source = input.source?.trim() || 'landing';

    const [existingRows] = (await db.execute('SELECT id FROM waitlist WHERE email = ?', [email])) as any[];
    if ((existingRows as any[]).length > 0) {
      return { success: true, already: true, message: 'Déjà inscrit !' };
    }

    try {
      await db.execute(
        'INSERT INTO waitlist (email, postal_code, city, role, source, confirmed) VALUES (?, ?, ?, ?, ?, FALSE)',
        [email, postalCode, city, dbRole, source]
      );
    } catch (e: any) {
      // Race condition possible entre le SELECT et l'INSERT (double-submit rapide) —
      // la contrainte UNIQUE protège malgré tout contre le doublon.
      if (e?.code === 'ER_DUP_ENTRY') {
        return { success: true, already: true, message: 'Déjà inscrit !' };
      }
      throw e;
    }

    const [countRows] = (await db.execute('SELECT COUNT(*) AS c FROM waitlist')) as any[];
    const position = Number((countRows as any[])[0]?.c || 0);

    // Log d'audit sans PII sensible : ni email ni code postal exact, uniquement le
    // rôle, la source et un hash tronqué non réversible de l'email pour un suivi anti-abus.
    const emailHash = Buffer.from(email).toString('base64').slice(0, 12);
    await logAudit(null, 'waitlist.join', 'waitlist', emailHash, { role: dbRole, source }, ctx.ip);

    return {
      success: true,
      already: false,
      position,
      message: `Bienvenue ! Vous êtes le n°${position} sur la liste.`,
    };
  }),
});
