// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Router tRPC : Système communes non connectées
// RGPD : aucune PII citoyenne transmise à la commune. Hashes uniquement. Count agrégé.
// Anti-spam : max 1 email queued / 30 jours / commune. Opt-out permanent respecté.

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import crypto from 'crypto';

// ─── Constantes ───────────────────────────────────────────
const CITY_CONTACT_HASH_SALT = process.env.CITY_HASH_SALT || 'vcOS-city-salt-2026';
const TOKEN_TTL_HOURS = 72;
const MIN_DAYS_BETWEEN_CONTACT_ATTEMPTS = 30;
const DISCLAIMER_TEXT =
  "Ces liens publics sont proposés pour faciliter l'accès aux services. " +
  "Ils ne sont pas encore validés officiellement par la commune.";

// Seuils qui déclenchent la mise en queue d'un email commune
const CITIZEN_COUNT_THRESHOLDS = [1, 5, 10, 25, 50];

// ─── Helpers ──────────────────────────────────────────────

/** Hash anonyme d'un user_id — jamais le vrai ID dans city_requests */
function hashUserId(userId: number): string {
  return crypto
    .createHmac('sha256', CITY_CONTACT_HASH_SALT)
    .update(String(userId))
    .digest('hex');
}

/** Vérifie si un email commune peut être queued (anti-spam + opt-out) */
async function canQueueEmail(cityId: number): Promise<{ can: boolean; reason?: string }> {
  // 1. Opt-out permanent
  const [optRows] = await db.execute(
    'SELECT opt_out_at, official_email FROM cities WHERE id = ?',
    [cityId]
  ) as any[];
  const city = (optRows as any[])[0];
  if (!city) return { can: false, reason: 'city_not_found' };
  if (city.opt_out_at) return { can: false, reason: 'opted_out' };
  if (!city.official_email) return { can: false, reason: 'no_official_email' };

  // 2. Délai minimum 30 jours depuis dernière tentative
  const [lastRows] = await db.execute(
    `SELECT created_at FROM city_contact_attempts
     WHERE city_id = ? AND status IN ('queued','sent')
     ORDER BY created_at DESC LIMIT 1`,
    [cityId]
  ) as any[];
  const last = (lastRows as any[])[0];
  if (last) {
    const daysSince = (Date.now() - new Date(last.created_at).getTime()) / 86400000;
    if (daysSince < MIN_DAYS_BETWEEN_CONTACT_ATTEMPTS) {
      return { can: false, reason: `too_recent_${Math.round(daysSince)}d` };
    }
  }
  return { can: true };
}

/** Queue un email commune (statut queued — V1 : pas d'envoi automatique) */
async function queueCommuneEmail(cityId: number, citizenCount: number, officialEmail: string): Promise<void> {
  await db.execute(
    `INSERT INTO city_contact_attempts
       (city_id, attempt_type, email_to, status, template_used, citizen_count, notes)
     VALUES (?, 'automated', ?, 'queued', 'commune_invitation_v1', ?, 'Auto-queued at threshold')`,
    [cityId, officialEmail, citizenCount]
  );
  // Mise à jour statut ville → contacted si elle n'était pas déjà plus avancée
  await db.execute(
    `UPDATE cities SET status = 'contacted'
     WHERE id = ? AND status IN ('unknown','pending_validation','public_links_available')`,
    [cityId]
  );
}

// ─── Router ───────────────────────────────────────────────
export const cityRouter = router({

  // ── 1. GET BY POSTAL CODE ─────────────────────────────
  // Public — retourne status + nom, jamais de données citoyennes
  getByPostalCode: publicProcedure
    .input(z.object({ postal_code: z.string().min(4).max(10) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT id, postal_code, name, region, country, status, opt_out_at
         FROM cities WHERE postal_code = ?`,
        [input.postal_code]
      ) as any[];
      const city = (rows as any[])[0];
      if (!city) {
        return {
          found: false,
          status: 'unknown' as const,
          message: 'Commune non encore référencée.',
          disclaimer: DISCLAIMER_TEXT,
        };
      }
      return {
        found: true,
        id: city.id,
        postal_code: city.postal_code,
        name: city.name,
        region: city.region,
        country: city.country,
        status: city.status as string,
        opted_out: !!city.opt_out_at,
        disclaimer: DISCLAIMER_TEXT,
      };
    }),

  // ── 2. GET SERVICE LINKS ───────────────────────────────
  // Public — liens publics uniquement, disclaimer obligatoire
  getServiceLinks: publicProcedure
    .input(z.object({ postal_code: z.string().min(4).max(10) }))
    .query(async ({ input }) => {
      const [cityRows] = await db.execute(
        'SELECT id, status, opt_out_at FROM cities WHERE postal_code = ?',
        [input.postal_code]
      ) as any[];
      const city = (cityRows as any[])[0];
      if (!city || city.opt_out_at) {
        return { links: [], disclaimer: DISCLAIMER_TEXT };
      }

      const [linkRows] = await db.execute(
        `SELECT id, service_type, label, url, verified_by_commune, verification_status
         FROM city_service_links
         WHERE city_id = ? AND is_active = 1
         ORDER BY service_type ASC`,
        [city.id]
      ) as any[];

      // Disclaimer supprimé pour les communes officiellement vérifiées
      const showDisclaimer = city.status !== 'verified';

      return {
        links: (linkRows as any[]).map((l: any) => ({
          id: l.id,
          service_type: l.service_type,
          label: l.label,
          url: l.url,
          verified_by_commune: !!l.verified_by_commune,
          verification_status: l.verification_status,
        })),
        disclaimer: showDisclaimer ? DISCLAIMER_TEXT : null,
        city_status: city.status,
      };
    }),

  // ── 3. REGISTER CITY INTEREST ─────────────────────────
  // Auth — crée city_request anonymisé + potentiellement queue email
  registerCityInterest: protectedProcedure
    .input(z.object({
      postal_code: z.string().min(4).max(10),
      city_name: z.string().max(128).optional(),
      request_type: z.enum(['first_signup', 'invite_request', 'citizen_demand']).default('invite_request'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userHash = hashUserId(ctx.user.id);

      // 1. Récupérer ou créer la ville
      let [cityRows] = await db.execute(
        'SELECT id, status, official_email, citizen_count, opt_out_at FROM cities WHERE postal_code = ?',
        [input.postal_code]
      ) as any[];
      let city = (cityRows as any[])[0];

      if (!city) {
        const [ins] = await db.execute(
          `INSERT INTO cities (postal_code, name, region, country, status)
           VALUES (?, ?, 'autre', 'BE', 'pending_validation')`,
          [input.postal_code, input.city_name || `Commune ${input.postal_code}`]
        ) as any[];
        const newId = (ins as any).insertId;
        [cityRows] = await db.execute('SELECT * FROM cities WHERE id = ?', [newId]) as any[];
        city = (cityRows as any[])[0];
      }

      if (city.opt_out_at) {
        // Commune a demandé opt-out — on ne trace rien
        return { ok: true, status: city.status, note: 'opted_out' };
      }

      // 2. Enregistrer la demande (UNIQUE city_id + user_id_hash → pas de doublon)
      const [existing] = await db.execute(
        'SELECT id FROM city_requests WHERE city_id = ? AND user_id_hash = ?',
        [city.id, userHash]
      ) as any[];
      const alreadyRequested = (existing as any[]).length > 0;

      if (!alreadyRequested) {
        await db.execute(
          'INSERT INTO city_requests (city_id, user_id_hash, request_type) VALUES (?, ?, ?)',
          [city.id, userHash, input.request_type]
        );

        // 3. Incrémenter le count agrégé
        await db.execute(
          'UPDATE cities SET citizen_count = citizen_count + 1 WHERE id = ?',
          [city.id]
        );
        city.citizen_count = (city.citizen_count || 0) + 1;
      }

      // 4. Vérifier seuil → potentiellement queue email
      let emailQueued = false;
      const currentCount = city.citizen_count;
      if (CITIZEN_COUNT_THRESHOLDS.includes(currentCount)) {
        const { can, reason } = await canQueueEmail(city.id);
        if (can && city.official_email) {
          await queueCommuneEmail(city.id, currentCount, city.official_email);
          emailQueued = true;
        }
        // Si pas d'email officiel : on log juste le seuil atteint pour traitement manuel
      }

      return {
        ok: true,
        city_id: city.id,
        status: city.status,
        citizen_count: currentCount,
        email_queued: emailQueued,
        disclaimer: DISCLAIMER_TEXT,
      };
    }),

  // ── 4. GET STATUS (auth) ───────────────────────────────
  // Utilisateur voit le statut de sa commune
  getStatus: protectedProcedure
    .input(z.object({ postal_code: z.string().min(4).max(10) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        'SELECT id, name, status, citizen_count FROM cities WHERE postal_code = ?',
        [input.postal_code]
      ) as any[];
      const city = (rows as any[])[0];
      if (!city) {
        return { found: false, status: 'unknown', disclaimer: DISCLAIMER_TEXT };
      }
      return {
        found: true,
        name: city.name,
        status: city.status,
        citizen_count: city.citizen_count,
        disclaimer: DISCLAIMER_TEXT,
      };
    }),

  // ── 5. VALIDATE LINKS (token commune) ─────────────────
  // Commune corrige/valide ses liens via token reçu par email
  validateLinks: publicProcedure
    .input(z.object({
      token: z.string().min(8).max(128),
      action: z.enum(['validate', 'correct', 'request_removal']),
      corrections: z.array(z.object({
        link_id: z.number().int().optional(),
        service_type: z.string().optional(),
        label: z.string().max(128).optional(),
        url: z.string().url().max(512).optional(),
        is_active: z.boolean().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      // 1. Vérifier token
      const [tokRows] = await db.execute(
        `SELECT * FROM city_validation_tokens
         WHERE token = ? AND used_at IS NULL AND expires_at > NOW()`,
        [input.token]
      ) as any[];
      const tok = (tokRows as any[])[0];
      if (!tok) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' });
      }

      const cityId = tok.city_id;

      // 2. Action : retrait
      if (input.action === 'request_removal') {
        await db.execute('UPDATE cities SET opt_out_at = NOW(), status = "rejected" WHERE id = ?', [cityId]);
        await db.execute('UPDATE city_service_links SET is_active = 0 WHERE city_id = ?', [cityId]);
        await db.execute('UPDATE city_validation_tokens SET used_at = NOW() WHERE id = ?', [tok.id]);
        return { ok: true, action: 'removed', message: 'Fiche désactivée. Vos liens ne seront plus affichés.' };
      }

      // 3. Action : validation / corrections
      if (input.corrections?.length) {
        for (const c of input.corrections) {
          if (c.link_id) {
            // Mettre à jour un lien existant
            const fields: string[] = [];
            const vals: any[] = [];
            if (c.label !== undefined) { fields.push('label = ?'); vals.push(c.label); }
            if (c.url !== undefined) { fields.push('url = ?'); vals.push(c.url); }
            if (c.is_active !== undefined) { fields.push('is_active = ?'); vals.push(c.is_active ? 1 : 0); }
            if (fields.length) {
              fields.push('verified_by_commune = 1', 'verification_status = "verified"');
              vals.push(c.link_id);
              await db.execute(`UPDATE city_service_links SET ${fields.join(', ')} WHERE id = ? AND city_id = ${cityId}`, vals);
            }
          }
        }
      }

      // 4. Mise à jour statut ville
      await db.execute(
        `UPDATE cities SET status = 'public_links_available'
         WHERE id = ? AND status NOT IN ('verified','interested')`,
        [cityId]
      );

      // 5. Marquer le token comme utilisé
      await db.execute('UPDATE city_validation_tokens SET used_at = NOW() WHERE id = ?', [tok.id]);

      return { ok: true, action: 'validated', message: 'Liens validés. Merci pour votre retour.' };
    }),

  // ── 6. ADMIN: SEND QUEUED EMAIL ───────────────────────
  // Admin uniquement — déclenche l'envoi réel d'un email queued via Resend
  adminSendQueuedEmail: adminProcedure
    .input(z.object({ attempt_id: z.number().int() }))
    .mutation(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT a.*, c.name as city_name, c.citizen_count
         FROM city_contact_attempts a
         JOIN cities c ON c.id = a.city_id
         WHERE a.id = ? AND a.status = 'queued'`,
        [input.attempt_id]
      ) as any[];
      const attempt = (rows as any[])[0];
      if (!attempt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tentative introuvable ou déjà envoyée' });
      }

      // Appel Resend
      const RESEND_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_KEY) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'RESEND_API_KEY manquante' });

      const emailHtml = buildCommuneEmailHtml(attempt.city_name, attempt.citizen_count, attempt.city_id);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'VilleConnect OS <noreply@villeconnectos.com>',
          to: [attempt.email_to],
          subject: `${attempt.citizen_count} citoyen(s) de ${attempt.city_name} utilisent VilleConnect OS`,
          html: emailHtml,
        }),
      });
      const resData = await res.json() as any;

      if (!res.ok) {
        await db.execute(
          `UPDATE city_contact_attempts SET status='bounced', notes=? WHERE id=?`,
          [JSON.stringify(resData), input.attempt_id]
        );
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resend error: ' + JSON.stringify(resData) });
      }

      await db.execute(
        `UPDATE city_contact_attempts SET status='sent', sent_at=NOW(), notes=? WHERE id=?`,
        [JSON.stringify({ resend_id: resData.id }), input.attempt_id]
      );

      return { ok: true, resend_id: resData.id };
    }),

  // ── 7. ADMIN: LIST QUEUED EMAILS ─────────────────────
  adminListQueuedEmails: adminProcedure
    .query(async () => {
      const [rows] = await db.execute(
        `SELECT a.id, a.city_id, c.name as city_name, a.email_to, a.status,
                a.citizen_count, a.template_used, a.created_at, a.sent_at
         FROM city_contact_attempts a
         JOIN cities c ON c.id = a.city_id
         ORDER BY a.created_at DESC
         LIMIT 100`
      ) as any[];
      return { attempts: rows as any[] };
    }),

  // ── 8. ADMIN: GENERATE VALIDATION TOKEN ──────────────
  adminGenerateToken: adminProcedure
    .input(z.object({
      city_id: z.number().int(),
      type: z.enum(['validate_links', 'request_activation', 'request_removal']),
    }))
    .mutation(async ({ input }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);
      await db.execute(
        `INSERT INTO city_validation_tokens (city_id, token, type, expires_at)
         VALUES (?, ?, ?, ?)`,
        [input.city_id, token, input.type, expiresAt]
      );
      return {
        token,
        expires_at: expiresAt.toISOString(),
        validation_url: `https://app.villeconnectos.com/commune/validate?token=${token}`,
      };
    }),
});

// ─── Template email commune ───────────────────────────────
function buildCommuneEmailHtml(cityName: string, citizenCount: number, cityId: number): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a2e;}
  .logo{color:#0047FF;font-weight:bold;font-size:20px;}
  .badge{background:#00E5FF;color:#0A2D5E;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:bold;}
  .cta{display:inline-block;background:#0047FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;}
  .features{background:#f0f4ff;border-radius:8px;padding:16px;margin:16px 0;}
  .features li{margin:4px 0;}
  .footer{margin-top:32px;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px;}
  .disclaimer{background:#fff8dc;border:1px solid #f5c518;border-radius:6px;padding:12px;font-size:12px;margin:16px 0;}
</style></head>
<body>
  <div class="logo">VilleConnect OS</div>
  <p style="color:#666;font-size:13px;">Le moteur intelligent de vos villes</p>
  <hr/>
  <p>Bonjour,</p>
  <p>
    <strong>${citizenCount} citoyen(s) de <span class="badge">${cityName}</span></strong>
    ont déjà rejoint VilleConnect OS et souhaitent accéder aux services de leur commune.
  </p>
  <p>VilleConnect OS permet à votre commune de proposer à vos citoyens :</p>
  <div class="features">
    <ul>
      <li>✅ Accès citoyen sécurisé</li>
      <li>✅ Redirections vers vos services publics</li>
      <li>✅ Actualités &amp; agenda officiels</li>
      <li>✅ Signalements citoyens locaux</li>
      <li>✅ Alertes communales</li>
      <li>✅ Commerces &amp; événements locaux</li>
      <li>✅ Wallet citoyen (missions civiques)</li>
      <li>✅ Centre de Contrôle local</li>
    </ul>
  </div>
  <p>
    Nous avons pré-configuré une fiche publique pour <strong>${cityName}</strong>.
    Nous vous invitons à vérifier et corriger vos informations si nécessaire.
  </p>
  <div class="disclaimer">
    ℹ️ Ces données sont uniquement agrégées — <strong>aucune information nominative</strong>
    n'est transmise à votre commune. Vous pouvez demander le retrait de votre fiche à tout moment.
  </div>
  <a class="cta" href="https://app.villeconnectos.com/commune/validate?city=${cityId}">
    ✅ Vérifier nos informations
  </a>
  <br/>
  <a href="https://app.villeconnectos.com/commune/opt-out?city=${cityId}" style="font-size:12px;color:#999;">
    Demander le retrait de notre fiche
  </a>
  <div class="footer">
    VilleConnect OS — noreply@villeconnectos.com<br/>
    Ce message a été envoyé car des citoyens de votre commune ont manifesté leur intérêt pour la plateforme.<br/>
    Vous ne recevrez pas plus de 1 email par mois de notre part.
  </div>
</body>
</html>`;
}
