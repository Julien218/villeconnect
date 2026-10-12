// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Administration des flux d'événements (iCal) importés depuis les sites des communes et ASBL.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from '../trpc';
import { db } from '../db';
import { parseFeedUrl } from '../lib/feedUrl';
import { syncFeed } from '../lib/eventFeedSync';

const feedInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(160),
  postalCode: z.string().trim().min(3).max(12).default('7370'),
  feedUrl: z.string().trim().url().max(512),
  defaultCategory: z.enum(['Culture', 'Sport', 'Marché', 'Jeunesse', 'Environnement', 'Communal', 'Autre']).default('Autre'),
  organizer: z.string().trim().max(160).optional(),
  autoApprove: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const eventFeedsRouter = router({
  adminList: adminProcedure.query(async () => {
    const [rows] = await db.execute(
      `SELECT id, name, postal_code AS postalCode, feed_url AS feedUrl, default_category AS defaultCategory,
              organizer, auto_approve AS autoApprove, is_active AS isActive,
              last_fetched_at AS lastFetchedAt, last_status AS lastStatus, last_message AS lastMessage,
              last_count AS lastCount
       FROM event_feeds ORDER BY id DESC LIMIT 100`
    ) as any[];
    return (rows as any[]).map(row => ({ ...row, autoApprove: Boolean(row.autoApprove), isActive: Boolean(row.isActive) }));
  }),

  adminSave: adminProcedure.input(feedInput).mutation(async ({ input }) => {
    try {
      parseFeedUrl(input.feedUrl);
    } catch (error: any) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
    }
    if (input.id) {
      const [result] = await db.execute(
        `UPDATE event_feeds SET name = ?, postal_code = ?, feed_url = ?, default_category = ?,
                organizer = ?, auto_approve = ?, is_active = ? WHERE id = ?`,
        [input.name, input.postalCode, input.feedUrl, input.defaultCategory, input.organizer || null,
         input.autoApprove ? 1 : 0, input.isActive ? 1 : 0, input.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Flux introuvable.' });
      }
      return { id: input.id };
    }
    try {
      const [result] = await db.execute(
        `INSERT INTO event_feeds (name, postal_code, feed_url, default_category, organizer, auto_approve, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.name, input.postalCode, input.feedUrl, input.defaultCategory, input.organizer || null,
         input.autoApprove ? 1 : 0, input.isActive ? 1 : 0]
      ) as any[];
      return { id: Number((result as any).insertId) };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Ce flux est déjà enregistré.' });
      }
      throw error;
    }
  }),

  // Synchronise un flux tout de suite (essai avant d'attendre la synchronisation automatique).
  adminSyncNow: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT id, name, postal_code, feed_url, default_category, organizer, auto_approve
         FROM event_feeds WHERE id = ?`,
        [input.id]
      ) as any[];
      const feed = (rows as any[])[0];
      if (!feed) throw new TRPCError({ code: 'NOT_FOUND', message: 'Flux introuvable.' });
      return syncFeed(feed);
    }),
});
