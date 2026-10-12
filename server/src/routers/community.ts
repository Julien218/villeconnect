// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Citoyens : annonces entre voisins, messagerie liée à une annonce, signalements, modération.
// Les règles (objets interdits, masquage des contacts, prix) sont dans lib/communityRules.ts.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { cityAdminProcedure, protectedProcedure, publicProcedure, router } from '../trpc';
import { db } from '../db';
import { checkRateLimit } from '../lib/auth';
import { moderateListing } from '../lib/aiModeration';
import {
  KINDS, REPORTS_TO_HIDE, cleanListing, cleanMessage, isTrustedAuthor, listingExpiry, publicName,
} from '../lib/communityRules';

const toSql = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
const kindSchema = z.enum(KINDS);

type Actor = { id: number; role: string; email_verified: boolean; authType?: string };

// Écrire sur le tableau exige un vrai compte (pas un jeton d'appareil) et un email vérifié.
async function requireMember(user: Actor): Promise<void> {
  if (user.authType !== 'access' || !user.email_verified) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Connectez-vous et vérifiez votre email pour utiliser les annonces.' });
  }
  const [bans] = await db.execute('SELECT 1 FROM community_bans WHERE user_id = ? LIMIT 1', [user.id]) as any[];
  if ((bans as any[]).length > 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Votre accès aux annonces est suspendu.' });
  }
}

async function isBlocked(a: number, b: number): Promise<boolean> {
  const [rows] = await db.execute(
    `SELECT 1 FROM community_blocks
     WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
    [a, b, b, a]
  ) as any[];
  return (rows as any[]).length > 0;
}

function rateLimit(key: string, max: number, windowMs: number, message: string) {
  if (!checkRateLimit(key, max, windowMs)) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message });
}

async function participantOf(conversationId: number, userId: number) {
  const [rows] = await db.execute(
    `SELECT c.id, c.listing_id AS listingId, c.owner_id AS ownerId, c.requester_id AS requesterId, l.title
     FROM community_conversations c JOIN community_listings l ON l.id = c.listing_id
     WHERE c.id = ? AND (c.owner_id = ? OR c.requester_id = ?)`,
    [conversationId, userId, userId]
  ) as any[];
  const conversation = (rows as any[])[0];
  if (!conversation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation introuvable.' });
  return conversation as { id: number; listingId: number; ownerId: number; requesterId: number; title: string };
}

export const communityRouter = router({
  // ── Annonces ──
  list: publicProcedure
    .input(z.object({
      postalCode: z.string().trim().min(3).max(12).default('7370'),
      kind: kindSchema.optional(),
      search: z.string().trim().max(60).optional(),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).max(1000).default(0),
    }))
    .query(async ({ input }) => {
      const params: any[] = [input.postalCode];
      let where = `l.postal_code = ? AND l.status = 'published' AND l.expires_at > UTC_TIMESTAMP()`;
      if (input.kind) { where += ' AND l.kind = ?'; params.push(input.kind); }
      if (input.search) {
        where += ' AND l.title LIKE ?';
        params.push(`%${input.search.replace(/[\\%_]/g, '\\$&')}%`);
      }
      const [rows] = await db.execute(
        `SELECT l.id, l.kind, l.title, LEFT(l.description, 200) AS description,
                l.price_cents AS priceCents, l.price_unit AS priceUnit, l.created_at AS createdAt,
                u.name AS authorName
         FROM community_listings l JOIN users u ON u.id = l.user_id
         WHERE ${where} ORDER BY l.id DESC LIMIT ${input.limit} OFFSET ${input.offset}`,
        params
      ) as any[];
      return (rows as any[]).map(({ authorName, ...row }) => ({ ...row, author: publicName(authorName) }));
    }),

  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT l.id, l.kind, l.title, l.description, l.price_cents AS priceCents, l.price_unit AS priceUnit,
                l.created_at AS createdAt, u.name AS authorName
         FROM community_listings l JOIN users u ON u.id = l.user_id
         WHERE l.id = ? AND l.status = 'published' AND l.expires_at > UTC_TIMESTAMP()`,
        [input.id]
      ) as any[];
      const row = (rows as any[])[0];
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable ou terminée.' });
      const { authorName, ...rest } = row;
      return { ...rest, author: publicName(authorName) };
    }),

  create: protectedProcedure
    .input(z.object({
      kind: kindSchema,
      title: z.string().max(200),
      description: z.string().max(4000),
      priceCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireMember(ctx.user as Actor);
      rateLimit(`listing:${ctx.user.id}`, 5, 24 * 3600 * 1000, 'Limite de 5 annonces par jour atteinte.');

      let clean;
      try {
        clean = cleanListing({ kind: input.kind, title: input.title, description: input.description, priceCents: input.priceCents ?? null });
      } catch (error: any) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
      }

      const [users] = await db.execute('SELECT postalCode FROM users WHERE id = ?', [ctx.user.id]) as any[];
      const postalCode = String((users as any[])[0]?.postalCode || '7370');

      const [stats] = await db.execute(
        `SELECT COALESCE(SUM(status IN ('published','closed')), 0) AS published,
                COALESCE(SUM(status IN ('removed','rejected')), 0) AS bad
         FROM community_listings WHERE user_id = ?`,
        [ctx.user.id]
      ) as any[];
      const trusted = isTrustedAuthor({
        published: Number((stats as any[])[0]?.published || 0),
        removedOrRejected: Number((stats as any[])[0]?.bad || 0),
      });
      // Pré-modération par IA (si activée). Elle peut refuser ou envoyer en vérification ;
      // elle ne publie directement que si COMMUNITY_AI_AUTOPUBLISH=1.
      const ai = await moderateListing(clean);
      let status: 'published' | 'pending' | 'rejected' = trusted ? 'published' : 'pending';
      if (ai?.verdict === 'reject') status = 'rejected';
      else if (ai?.verdict === 'review') status = 'pending';
      else if (ai?.verdict === 'approve' && process.env.COMMUNITY_AI_AUTOPUBLISH === '1') status = 'published';

      const [result] = await db.execute(
        `INSERT INTO community_listings
           (user_id, kind, title, description, price_cents, price_unit, postal_code, status, ai_verdict, ai_note, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ctx.user.id, clean.kind, clean.title, clean.description, clean.priceCents, clean.priceUnit,
         postalCode, status, ai?.verdict ?? null, ai ? ai.reason.slice(0, 255) : null, toSql(listingExpiry())]
      ) as any[];
      return {
        id: Number((result as any).insertId),
        status,
        published: status === 'published',
        rejected: status === 'rejected',
        message: status === 'rejected' ? `Annonce refusée : ${ai?.reason || 'elle ne respecte pas les règles.'}` : null,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const [rows] = await db.execute(
      `SELECT id, kind, title, price_cents AS priceCents, price_unit AS priceUnit, status,
              expires_at AS expiresAt, created_at AS createdAt
       FROM community_listings WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
      [ctx.user.id]
    ) as any[];
    return rows;
  }),

  close: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.execute(
        `UPDATE community_listings SET status = 'closed'
         WHERE id = ? AND user_id = ? AND status IN ('pending', 'published')`,
        [input.id, ctx.user.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable.' });
      }
      return { success: true };
    }),

  // ── Messagerie (toujours liée à une annonce) ──
  startConversation: protectedProcedure
    .input(z.object({ listingId: z.number().int().positive(), message: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await requireMember(ctx.user as Actor);
      rateLimit(`conv:${ctx.user.id}`, 20, 3600 * 1000, 'Trop de nouvelles conversations. Réessayez plus tard.');
      let body: string;
      try { body = cleanMessage(input.message); } catch (error: any) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
      }

      const [rows] = await db.execute(
        `SELECT id, user_id FROM community_listings
         WHERE id = ? AND status = 'published' AND expires_at > UTC_TIMESTAMP()`,
        [input.listingId]
      ) as any[];
      const listing = (rows as any[])[0];
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable ou terminée.' });
      const ownerId = Number(listing.user_id);
      if (ownerId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous ne pouvez pas répondre à votre propre annonce.' });
      }
      if (await isBlocked(ctx.user.id, ownerId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cette personne n’est pas joignable.' });
      }

      const [conv] = await db.execute(
        `INSERT INTO community_conversations (listing_id, owner_id, requester_id)
         VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), last_message_at = UTC_TIMESTAMP()`,
        [input.listingId, ownerId, ctx.user.id]
      ) as any[];
      const conversationId = Number((conv as any).insertId);
      await db.execute(
        'INSERT INTO community_messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
        [conversationId, ctx.user.id, body]
      );
      return { conversationId };
    }),

  conversations: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.user.id;
    const [rows] = await db.execute(
      `SELECT c.id, c.listing_id AS listingId, l.title, c.last_message_at AS lastMessageAt,
              u.name AS otherName,
              (SELECT body FROM community_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastBody,
              (SELECT COUNT(*) FROM community_messages m
                 WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.read_at IS NULL) AS unread
       FROM community_conversations c
       JOIN community_listings l ON l.id = c.listing_id
       JOIN users u ON u.id = IF(c.owner_id = ?, c.requester_id, c.owner_id)
       WHERE c.owner_id = ? OR c.requester_id = ?
       ORDER BY c.last_message_at DESC LIMIT 50`,
      [me, me, me, me]
    ) as any[];
    return (rows as any[]).map(({ otherName, unread, ...row }) => ({
      ...row, other: publicName(otherName), unread: Number(unread),
    }));
  }),

  // Lit une conversation et marque comme lus les messages de l'autre personne.
  messages: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), afterId: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      const conversation = await participantOf(input.conversationId, ctx.user.id);
      const otherId = conversation.ownerId === ctx.user.id ? conversation.requesterId : conversation.ownerId;
      const [rows] = await db.execute(
        `SELECT id, sender_id AS senderId, body, created_at AS createdAt
         FROM community_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC LIMIT 200`,
        [input.conversationId, input.afterId]
      ) as any[];
      await db.execute(
        `UPDATE community_messages SET read_at = UTC_TIMESTAMP()
         WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL`,
        [input.conversationId, ctx.user.id]
      );
      const [names] = await db.execute('SELECT name FROM users WHERE id = ?', [otherId]) as any[];
      return {
        title: conversation.title,
        listingId: conversation.listingId,
        otherId,
        other: publicName((names as any[])[0]?.name),
        blocked: await isBlocked(ctx.user.id, otherId),
        messages: (rows as any[]).map(({ senderId, ...row }) => ({ ...row, mine: Number(senderId) === ctx.user.id })),
      };
    }),

  send: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), body: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await requireMember(ctx.user as Actor);
      rateLimit(`msg:${ctx.user.id}`, 60, 3600 * 1000, 'Trop de messages envoyés. Patientez un peu.');
      let body: string;
      try { body = cleanMessage(input.body); } catch (error: any) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
      }
      const conversation = await participantOf(input.conversationId, ctx.user.id);
      const otherId = conversation.ownerId === ctx.user.id ? conversation.requesterId : conversation.ownerId;
      if (await isBlocked(ctx.user.id, otherId)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cette personne n’est pas joignable.' });
      }
      await db.execute(
        'INSERT INTO community_messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
        [input.conversationId, ctx.user.id, body]
      );
      await db.execute('UPDATE community_conversations SET last_message_at = UTC_TIMESTAMP() WHERE id = ?', [input.conversationId]);
      return { success: true };
    }),

  // ── Sécurité ──
  block: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action impossible.' });
      await db.execute('INSERT IGNORE INTO community_blocks (blocker_id, blocked_id) VALUES (?, ?)', [ctx.user.id, input.userId]);
      return { success: true };
    }),

  // Au-delà de REPORTS_TO_HIDE signalements distincts, l'annonce repasse en attente de vérification.
  report: protectedProcedure
    .input(z.object({
      listingId: z.number().int().positive(),
      reason: z.enum(['forbidden', 'scam', 'abuse', 'other']),
      details: z.string().trim().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireMember(ctx.user as Actor);
      rateLimit(`report:${ctx.user.id}`, 20, 24 * 3600 * 1000, 'Trop de signalements aujourd’hui.');
      const [rows] = await db.execute('SELECT user_id FROM community_listings WHERE id = ?', [input.listingId]) as any[];
      const listing = (rows as any[])[0];
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable.' });
      if (Number(listing.user_id) === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous ne pouvez pas signaler votre propre annonce.' });
      }
      await db.execute(
        'INSERT IGNORE INTO community_reports (listing_id, reporter_id, reason, details) VALUES (?, ?, ?, ?)',
        [input.listingId, ctx.user.id, input.reason, input.details || null]
      );
      const [counts] = await db.execute(
        'SELECT COUNT(*) AS total FROM community_reports WHERE listing_id = ?', [input.listingId]
      ) as any[];
      if (Number((counts as any[])[0]?.total || 0) >= REPORTS_TO_HIDE) {
        await db.execute(`UPDATE community_listings SET status = 'pending' WHERE id = ? AND status = 'published'`, [input.listingId]);
      }
      return { success: true };
    }),

  // ── Modération ──
  adminQueue: cityAdminProcedure
    .input(z.object({ postalCode: z.string().trim().min(3).max(12).default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT l.id, l.kind, l.title, l.description, l.created_at AS createdAt, l.ai_note AS aiNote, u.name AS authorName,
                (SELECT COUNT(*) FROM community_reports r WHERE r.listing_id = l.id) AS reports
         FROM community_listings l JOIN users u ON u.id = l.user_id
         WHERE l.postal_code = ? AND l.status = 'pending'
         ORDER BY reports DESC, l.id ASC LIMIT 50`,
        [input.postalCode]
      ) as any[];
      return (rows as any[]).map(({ authorName, reports, ...row }) => ({
        ...row, author: publicName(authorName), reports: Number(reports),
      }));
    }),

  adminDecide: cityAdminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      action: z.enum(['approve', 'reject', 'remove']),
      ban: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const [rows] = await db.execute('SELECT user_id FROM community_listings WHERE id = ?', [input.id]) as any[];
      const listing = (rows as any[])[0];
      if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable.' });

      const next = input.action === 'approve' ? 'published' : input.action === 'reject' ? 'rejected' : 'removed';
      await db.execute('UPDATE community_listings SET status = ? WHERE id = ?', [next, input.id]);
      if (input.action === 'approve') {
        await db.execute('DELETE FROM community_reports WHERE listing_id = ?', [input.id]);
      }
      // L'exclusion d'un utilisateur est réservée à l'administration globale.
      if (input.ban && input.action !== 'approve' && ['admin', 'super_admin'].includes(ctx.user.role)) {
        await db.execute('INSERT IGNORE INTO community_bans (user_id, reason) VALUES (?, ?)', [listing.user_id, 'Décision de modération']);
        await db.execute(`UPDATE community_listings SET status = 'removed' WHERE user_id = ? AND status IN ('pending','published')`, [listing.user_id]);
      }
      return { success: true };
    }),
});
