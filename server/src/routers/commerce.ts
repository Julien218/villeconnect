// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { createHash } from 'crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, adminProcedure } from '../trpc';
import { db } from '../db';
import { checkRateLimit, logAudit } from '../lib/auth';

const commerceInput = z.object({
  name: z.string().trim().min(2).max(180),
  legalName: z.string().trim().max(180).optional(),
  category: z.string().trim().min(2).max(100).default('Commerce'),
  description: z.string().trim().max(4000).optional(),
  address: z.string().trim().min(3).max(255),
  postalCode: z.string().trim().regex(/^\d{4}$/, 'Code postal belge invalide'),
  city: z.string().trim().min(2).max(128),
  phone: z.string().trim().max(40).optional(),
  email: z.string().email().max(320).optional().or(z.literal('')),
  website: z.string().url().max(500).optional().or(z.literal('')),
  imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
});

function normalized(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dedupeKey(input: z.infer<typeof commerceInput>) {
  return createHash('sha256')
    .update(`${normalized(input.name)}|${normalized(input.address)}|${input.postalCode}`)
    .digest('hex');
}

const publicColumns = `id, name, category, description, address, postal_code AS postalCode,
  city, phone, website, image_url AS imageUrl, published_at AS publishedAt`;

export const commerceRouter = router({
  listPublished: publicProcedure
    .input(z.object({ postalCode: z.string().regex(/^\d{4}$/), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT ${publicColumns} FROM commerce_catalog
         WHERE postal_code = ? AND validation_status = 'approved' AND publication_status = 'published'
         ORDER BY name ASC LIMIT ${input.limit}`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),

  submit: publicProcedure.input(commerceInput).mutation(async ({ ctx, input }) => {
    if (!checkRateLimit(`commerce-submit:${ctx.ip || 'unknown'}`, 5, 60 * 60 * 1000)) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de demandes, réessayez plus tard' });
    }
    const key = dedupeKey(input);
    const [existing] = await db.execute(
      'SELECT id, validation_status AS validationStatus, publication_status AS publicationStatus FROM commerce_catalog WHERE dedupe_key = ?',
      [key]
    ) as any[];
    if ((existing as any[])[0]) return { success: true, already: true, commerce: (existing as any[])[0] };

    try {
      const [result] = await db.execute(
        `INSERT INTO commerce_catalog
          (dedupe_key, name, legal_name, category, description, address, postal_code, city, phone, email, website, image_url, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'landing')`,
        [key, input.name, input.legalName || null, input.category, input.description || null,
          input.address, input.postalCode, input.city, input.phone || null, input.email || null,
          input.website || null, input.imageUrl || null]
      ) as any[];
      await logAudit(null, 'commerce.submit', 'commerce_catalog', String((result as any).insertId), { source: 'landing' }, ctx.ip);
      return { success: true, already: false, id: (result as any).insertId, validationStatus: 'pending', publicationStatus: 'draft' };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') return { success: true, already: true };
      throw error;
    }
  }),

  listForReview: adminProcedure
    .input(z.object({ status: z.enum(['pending','approved','rejected']).optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const params: any[] = [];
      const where = input.status ? (params.push(input.status), 'WHERE validation_status = ?') : '';
      const [rows] = await db.execute(`SELECT * FROM commerce_catalog ${where} ORDER BY created_at DESC LIMIT ${input.limit}`, params) as any[];
      return rows;
    }),

  upsertFromBackoffice: adminProcedure.input(commerceInput.extend({ id: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const key = dedupeKey(input);
      const values = [input.name, input.legalName || null, input.category, input.description || null,
        input.address, input.postalCode, input.city, input.phone || null, input.email || null,
        input.website || null, input.imageUrl || null];
      if (input.id) {
        try {
          await db.execute(
            `UPDATE commerce_catalog SET dedupe_key = ?, name = ?, legal_name = ?, category = ?, description = ?,
             address = ?, postal_code = ?, city = ?, phone = ?, email = ?, website = ?, image_url = ?, source = 'backoffice'
             WHERE id = ?`,
            [key, ...values, input.id]
          );
        } catch (error: any) {
          if (error?.code === 'ER_DUP_ENTRY') throw new TRPCError({ code: 'CONFLICT', message: 'Un commerce équivalent existe déjà' });
          throw error;
        }
        return { success: true, id: input.id, created: false };
      }
      const [existing] = await db.execute('SELECT id FROM commerce_catalog WHERE dedupe_key = ?', [key]) as any[];
      if ((existing as any[])[0]) return { success: true, id: (existing as any[])[0].id, created: false, already: true };
      const [result] = await db.execute(
        `INSERT INTO commerce_catalog
          (dedupe_key, name, legal_name, category, description, address, postal_code, city, phone, email, website, image_url, source, submitted_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'backoffice', ?)`,
        [key, ...values, ctx.user!.id]
      ) as any[];
      return { success: true, id: (result as any).insertId, created: true };
    }),

  review: adminProcedure
    .input(z.object({ id: z.number().int().positive(), validationStatus: z.enum(['approved','rejected']), publish: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const publication = input.validationStatus === 'approved' && input.publish ? 'published' : 'draft';
      await db.execute(
        `UPDATE commerce_catalog SET validation_status = ?, publication_status = ?, validated_by_user_id = ?,
         validated_at = NOW(), published_at = IF(? = 'published', COALESCE(published_at, NOW()), NULL) WHERE id = ?`,
        [input.validationStatus, publication, ctx.user!.id, publication, input.id]
      );
      await logAudit(ctx.user!.id, 'commerce.review', 'commerce_catalog', String(input.id), { validationStatus: input.validationStatus, publication }, ctx.ip);
      return { success: true, validationStatus: input.validationStatus, publicationStatus: publication };
    }),
});

