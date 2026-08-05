// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { createHash } from 'crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, publicProcedure, router } from '../trpc';
import { db } from '../db';

const optionalUrl = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().url().max(1000).optional()
);

const optionalText = (max: number) => z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(max).optional()
);

const commerceFields = z.object({
  name: z.string().trim().min(2).max(190),
  category: z.string().trim().min(2).max(100).default('Commerce'),
  description: optionalText(4000),
  address: z.string().trim().min(3).max(255),
  postalCode: z.string().trim().min(3).max(12).regex(/^[0-9A-Za-z -]+$/),
  city: z.string().trim().min(2).max(120),
  phone: optionalText(40),
  email: z.preprocess(
    value => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().email().max(190).optional()
  ),
  website: optionalUrl,
  imageUrl: optionalUrl,
  consentPublication: z.literal(true),
});

type CommerceFields = z.infer<typeof commerceFields>;

function normalizeIdentity(value: string) {
  return value.trim().toLocaleLowerCase('fr-BE').replace(/\s+/g, ' ');
}

export function commerceCanonicalKey(input: Pick<CommerceFields, 'name' | 'address' | 'postalCode'>) {
  return createHash('sha256')
    .update([
      normalizeIdentity(input.name),
      normalizeIdentity(input.address),
      normalizeIdentity(input.postalCode),
    ].join('|'))
    .digest('hex');
}

// Limitation ciblée sur les soumissions publiques. Cette protection complète, mais ne
// remplace pas, une limitation distribuée au niveau du reverse proxy en production.
const SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const SUBMISSION_LIMIT = 5;
const submissionBuckets = new Map<string, number[]>();

function enforceSubmissionRateLimit(ip = 'unknown') {
  const now = Date.now();
  const recent = (submissionBuckets.get(ip) || []).filter(ts => now - ts < SUBMISSION_WINDOW_MS);
  if (recent.length >= SUBMISSION_LIMIT) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de demandes. Réessayez plus tard.',
    });
  }
  recent.push(now);
  submissionBuckets.set(ip, recent);

  if (submissionBuckets.size > 5000) {
    for (const [key, values] of submissionBuckets) {
      if (!values.some(ts => now - ts < SUBMISSION_WINDOW_MS)) submissionBuckets.delete(key);
    }
  }
}

const publicSelect = `
  id, name, category, description, address,
  postal_code AS postalCode, city_name AS city,
  phone, email, website, image_url AS imageUrl,
  rating, review_count AS reviewCount,
  has_promotion AS hasPromotion, promotion_text AS promotionText,
  published_at AS publishedAt
`;

export const commerceRouter = router({
  submit: publicProcedure
    .input(commerceFields.extend({
      privacyConsent: z.literal(true),
      contactFax: z.string().max(200).optional().default(''),
    }))
    .mutation(async ({ input, ctx }) => {
      // Champ leurre : réponse neutre sans écriture pour les robots qui le remplissent.
      if (input.contactFax.trim().length > 0) {
        return { accepted: true, duplicate: false, status: 'pending' as const };
      }

      enforceSubmissionRateLimit(ctx.ip);
      const canonicalKey = commerceCanonicalKey(input);

      const [result] = await db.execute(
        `INSERT INTO commerce_catalog (
          canonical_key, name, category, description, address, postal_code, city_name,
          phone, email, website, image_url, validation_status, publication_status,
          source, consent_publication
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'draft', 'landing', 1)
        ON DUPLICATE KEY UPDATE
          description = IF(validation_status = 'pending', VALUES(description), description),
          phone = IF(validation_status = 'pending', VALUES(phone), phone),
          email = IF(validation_status = 'pending', VALUES(email), email),
          website = IF(validation_status = 'pending', VALUES(website), website),
          image_url = IF(validation_status = 'pending', VALUES(image_url), image_url),
          updated_at = CURRENT_TIMESTAMP`,
        [
          canonicalKey, input.name, input.category, input.description || null,
          input.address, input.postalCode, input.city, input.phone || null,
          input.email || null, input.website || null, input.imageUrl || null,
        ]
      ) as any[];

      const [rows] = await db.execute(
        `SELECT id, validation_status AS validationStatus,
                publication_status AS publicationStatus
         FROM commerce_catalog WHERE canonical_key = ? LIMIT 1`,
        [canonicalKey]
      ) as any[];

      const row = (rows as any[])[0];
      return {
        accepted: true,
        duplicate: Number((result as any).affectedRows) !== 1,
        id: String(row.id),
        status: row.validationStatus as 'pending' | 'approved' | 'rejected',
        publicationStatus: row.publicationStatus,
      };
    }),

  listPublished: publicProcedure
    .input(z.object({
      postalCode: z.string().trim().min(3).max(12).optional(),
      q: z.string().trim().max(100).optional(),
      limit: z.number().int().min(1).max(100).default(30),
      cursor: z.string().regex(/^\d+$/).optional(),
    }))
    .query(async ({ input }) => {
      const filters = ["validation_status = 'approved'", "publication_status = 'published'"];
      const params: any[] = [];

      if (input.postalCode) {
        filters.push('postal_code = ?');
        params.push(input.postalCode);
      }
      if (input.q) {
        filters.push('(name LIKE ? OR category LIKE ? OR address LIKE ?)');
        const q = `%${input.q}%`;
        params.push(q, q, q);
      }
      if (input.cursor) {
        filters.push('id > ?');
        params.push(input.cursor);
      }

      const fetchLimit = input.limit + 1;
      const [rows] = await db.execute(
        `SELECT ${publicSelect}
         FROM commerce_catalog
         WHERE ${filters.join(' AND ')}
         ORDER BY id ASC
         LIMIT ${fetchLimit}`,
        params
      ) as any[];

      const items = rows as any[];
      const hasMore = items.length > input.limit;
      if (hasMore) items.pop();
      return {
        items: items.map(item => ({ ...item, id: String(item.id) })),
        nextCursor: hasMore ? String(items[items.length - 1].id) : null,
      };
    }),

  listForReview: adminProcedure
    .input(z.object({
      validationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
      publicationStatus: z.enum(['draft', 'published', 'suspended', 'archived']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z.string().regex(/^\d+$/).optional(),
    }))
    .query(async ({ input }) => {
      const filters = ['1 = 1'];
      const params: any[] = [];
      if (input.validationStatus) {
        filters.push('validation_status = ?');
        params.push(input.validationStatus);
      }
      if (input.publicationStatus) {
        filters.push('publication_status = ?');
        params.push(input.publicationStatus);
      }
      if (input.cursor) {
        filters.push('id < ?');
        params.push(input.cursor);
      }

      const fetchLimit = input.limit + 1;
      const [rows] = await db.execute(
        `SELECT id, canonical_key AS canonicalKey, legacy_shop_id AS legacyShopId,
                name, category, description, address, postal_code AS postalCode,
                city_name AS city, phone, email, website, image_url AS imageUrl,
                validation_status AS validationStatus,
                publication_status AS publicationStatus, source,
                consent_publication AS consentPublication,
                rejection_reason AS rejectionReason,
                created_at AS createdAt, updated_at AS updatedAt
         FROM commerce_catalog
         WHERE ${filters.join(' AND ')}
         ORDER BY id DESC
         LIMIT ${fetchLimit}`,
        params
      ) as any[];

      const items = rows as any[];
      const hasMore = items.length > input.limit;
      if (hasMore) items.pop();
      return {
        items: items.map(item => ({
          ...item,
          id: String(item.id),
          consentPublication: Boolean(item.consentPublication),
        })),
        nextCursor: hasMore ? String(items[items.length - 1].id) : null,
      };
    }),

  review: adminProcedure
    .input(z.discriminatedUnion('action', [
      z.object({
        id: z.string().regex(/^\d+$/),
        action: z.literal('approve'),
        publish: z.boolean().default(false),
      }),
      z.object({
        id: z.string().regex(/^\d+$/),
        action: z.literal('reject'),
        reason: z.string().trim().min(3).max(500),
      }),
    ]))
    .mutation(async ({ input, ctx }) => {
      if (input.action === 'approve') {
        const [result] = await db.execute(
          `UPDATE commerce_catalog
           SET validation_status = 'approved',
               publication_status = IF(? = 1 AND consent_publication = 1, 'published', 'draft'),
               reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP,
               published_at = IF(? = 1 AND consent_publication = 1, CURRENT_TIMESTAMP, published_at),
               rejection_reason = NULL
           WHERE id = ?`,
          [input.publish ? 1 : 0, ctx.user.id, input.publish ? 1 : 0, input.id]
        ) as any[];
        if (Number((result as any).affectedRows) !== 1) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Commerce introuvable' });
        }
      } else {
        const [result] = await db.execute(
          `UPDATE commerce_catalog
           SET validation_status = 'rejected', publication_status = 'draft',
               reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP,
               rejection_reason = ?
           WHERE id = ?`,
          [ctx.user.id, input.reason, input.id]
        ) as any[];
        if (Number((result as any).affectedRows) !== 1) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Commerce introuvable' });
        }
      }
      return { success: true };
    }),

  setPublication: adminProcedure
    .input(z.object({
      id: z.string().regex(/^\d+$/),
      status: z.enum(['draft', 'published', 'suspended', 'archived']),
    }))
    .mutation(async ({ input }) => {
      const [result] = await db.execute(
        `UPDATE commerce_catalog
         SET publication_status = ?,
             published_at = IF(? = 'published', COALESCE(published_at, CURRENT_TIMESTAMP), published_at)
         WHERE id = ?
           AND validation_status = 'approved'
           AND (? <> 'published' OR consent_publication = 1)`,
        [input.status, input.status, input.id, input.status]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Le commerce doit être approuvé et disposer du consentement requis.',
        });
      }
      return { success: true };
    }),

  upsertFromBackoffice: adminProcedure
    .input(commerceFields.extend({
      id: z.string().regex(/^\d+$/).optional(),
      validationStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      publicationStatus: z.enum(['draft', 'published', 'suspended', 'archived']).default('draft'),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.publicationStatus === 'published' && input.validationStatus !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Une fiche doit être approuvée avant publication.',
        });
      }

      const canonicalKey = commerceCanonicalKey(input);
      if (input.id) {
        const [result] = await db.execute(
          `UPDATE commerce_catalog SET
             canonical_key = ?, name = ?, category = ?, description = ?, address = ?,
             postal_code = ?, city_name = ?, phone = ?, email = ?, website = ?, image_url = ?,
             validation_status = ?, publication_status = ?, consent_publication = 1,
             reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP,
             published_at = IF(? = 'published', COALESCE(published_at, CURRENT_TIMESTAMP), published_at)
           WHERE id = ?`,
          [
            canonicalKey, input.name, input.category, input.description || null, input.address,
            input.postalCode, input.city, input.phone || null, input.email || null,
            input.website || null, input.imageUrl || null, input.validationStatus,
            input.publicationStatus, ctx.user.id, input.publicationStatus, input.id,
          ]
        ) as any[];
        if (Number((result as any).affectedRows) !== 1) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Commerce introuvable' });
        }
        return { success: true, id: input.id, created: false };
      }

      try {
        const [result] = await db.execute(
          `INSERT INTO commerce_catalog (
             canonical_key, name, category, description, address, postal_code, city_name,
             phone, email, website, image_url, validation_status, publication_status,
             source, consent_publication, submitted_by_user_id, reviewed_by_user_id,
             reviewed_at, published_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'backoffice', 1, ?, ?,
                     CURRENT_TIMESTAMP, IF(? = 'published', CURRENT_TIMESTAMP, NULL))`,
          [
            canonicalKey, input.name, input.category, input.description || null, input.address,
            input.postalCode, input.city, input.phone || null, input.email || null,
            input.website || null, input.imageUrl || null, input.validationStatus,
            input.publicationStatus, ctx.user.id, ctx.user.id, input.publicationStatus,
          ]
        ) as any[];
        return { success: true, id: String((result as any).insertId), created: true };
      } catch (error: any) {
        if (error?.code === 'ER_DUP_ENTRY') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Un commerce avec ce nom et cette adresse existe déjà.',
          });
        }
        throw error;
      }
    }),
});
