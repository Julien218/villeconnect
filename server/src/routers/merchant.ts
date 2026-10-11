// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Espace commerçant : produits, liaison au compte Stripe, suivi des commandes et retrait.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, merchantProcedure, router } from '../trpc';
import { db } from '../db';
import { checkRateLimit } from '../lib/auth';
import { MAX_ORDER_CENTS, normalizePickupCode } from '../lib/money';
import {
  StripeApiError, createAccountLink, createStandardAccount, isStripeConfigured, retrieveAccount,
} from '../lib/stripe';

type Actor = { id: number; role: string };

const commerceId = z.number().int().positive();

// Un commerçant n'accède qu'aux commerces auxquels il est rattaché (l'administration, à tous).
async function requireMembership(actor: Actor, id: number, ownerOnly = false): Promise<void> {
  if (['admin', 'super_admin'].includes(actor.role)) return;
  const [rows] = await db.execute(
    'SELECT member_role FROM commerce_members WHERE commerce_id = ? AND user_id = ? LIMIT 1',
    [id, actor.id]
  ) as any[];
  const member = (rows as any[])[0];
  if (!member) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Vous n’êtes pas rattaché à ce commerce.' });
  }
  if (ownerOnly && member.member_role !== 'owner') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Action réservée au propriétaire du commerce.' });
  }
}

function webBase(): string {
  const base = (process.env.WEB_APP_URL || '').trim().replace(/\/$/, '');
  if (!base) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Adresse de l’application non configurée.' });
  }
  return base;
}

function stripeFailure(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  console.error(JSON.stringify({
    level: 'error', scope: 'stripe',
    status: error instanceof StripeApiError ? error.status : undefined,
    code: error instanceof StripeApiError ? error.code : undefined,
    message: (error as Error).message,
  }));
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Le service de paiement est momentanément indisponible. Réessayez plus tard.',
  });
}

const productInput = z.object({
  commerceId,
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(190),
  description: z.string().trim().max(1000).optional(),
  priceCents: z.number().int().min(50).max(MAX_ORDER_CENTS),
  stock: z.number().int().min(0).max(100000).nullable().optional(),
  imageUrl: z.string().trim().url().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const merchantRouter = router({
  myCommerces: merchantProcedure.query(async ({ ctx }) => {
    const [rows] = await db.execute(
      `SELECT m.commerce_id AS id, m.member_role AS memberRole, c.name,
              c.publication_status AS publicationStatus,
              COALESCE(p.charges_enabled, 0) AS chargesEnabled
       FROM commerce_members m
       JOIN commerce_catalog c ON c.id = m.commerce_id
       LEFT JOIN commerce_payment_accounts p ON p.commerce_id = m.commerce_id
       WHERE m.user_id = ? ORDER BY c.name ASC`,
      [ctx.user.id]
    ) as any[];
    return (rows as any[]).map(row => ({ ...row, chargesEnabled: Boolean(row.chargesEnabled) }));
  }),

  // ── Paiement : le commerçant relie SON compte Stripe (il garde ses fonds et ses litiges) ──
  startPaymentOnboarding: merchantProcedure
    .input(z.object({ commerceId }))
    .mutation(async ({ ctx, input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Le paiement en ligne n’est pas encore activé.' });
      }
      await requireMembership(ctx.user, input.commerceId, true);
      const base = webBase();
      try {
        const [rows] = await db.execute(
          'SELECT stripe_account_id FROM commerce_payment_accounts WHERE commerce_id = ?',
          [input.commerceId]
        ) as any[];
        let accountId: string | undefined = (rows as any[])[0]?.stripe_account_id;

        if (!accountId) {
          const [userRows] = await db.execute('SELECT email FROM users WHERE id = ?', [ctx.user.id]) as any[];
          const account = await createStandardAccount({
            email: (userRows as any[])[0]?.email || undefined,
            commerceId: input.commerceId,
          });
          accountId = account.id;
          await db.execute(
            `INSERT INTO commerce_payment_accounts (commerce_id, stripe_account_id) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE commerce_id = commerce_id`,
            [input.commerceId, accountId]
          );
        }

        const link = await createAccountLink({
          accountId,
          returnUrl: `${base}/pro/paiements?retour=1`,
          refreshUrl: `${base}/pro/paiements?refresh=1`,
        });
        return { url: link.url };
      } catch (error) {
        return stripeFailure(error);
      }
    }),

  refreshPaymentStatus: merchantProcedure
    .input(z.object({ commerceId }))
    .mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user, input.commerceId);
      const [rows] = await db.execute(
        'SELECT stripe_account_id FROM commerce_payment_accounts WHERE commerce_id = ?',
        [input.commerceId]
      ) as any[];
      const accountId = (rows as any[])[0]?.stripe_account_id;
      if (!accountId) return { connected: false, chargesEnabled: false, detailsSubmitted: false };
      try {
        const account = await retrieveAccount(accountId);
        await db.execute(
          `UPDATE commerce_payment_accounts SET charges_enabled = ?, details_submitted = ?
           WHERE commerce_id = ?`,
          [account.charges_enabled ? 1 : 0, account.details_submitted ? 1 : 0, input.commerceId]
        );
        return {
          connected: true,
          chargesEnabled: Boolean(account.charges_enabled),
          detailsSubmitted: Boolean(account.details_submitted),
        };
      } catch (error) {
        return stripeFailure(error);
      }
    }),

  // ── Produits ──
  productList: merchantProcedure
    .input(z.object({ commerceId }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.user, input.commerceId);
      const [rows] = await db.execute(
        `SELECT id, name, description, price_cents AS priceCents, stock,
                image_url AS imageUrl, is_active AS isActive
         FROM products WHERE commerce_id = ? ORDER BY name ASC LIMIT 500`,
        [input.commerceId]
      ) as any[];
      return (rows as any[]).map(row => ({ ...row, isActive: Boolean(row.isActive) }));
    }),

  productSave: merchantProcedure
    .input(productInput)
    .mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user, input.commerceId);
      const stock = input.stock === undefined ? null : input.stock;
      if (input.id) {
        const [result] = await db.execute(
          `UPDATE products SET name = ?, description = ?, price_cents = ?, stock = ?,
                  image_url = ?, is_active = ?
           WHERE id = ? AND commerce_id = ?`,
          [
            input.name, input.description || null, input.priceCents, stock,
            input.imageUrl || null, input.isActive ? 1 : 0, input.id, input.commerceId,
          ]
        ) as any[];
        if (Number((result as any).affectedRows) !== 1) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Produit introuvable.' });
        }
        return { id: input.id };
      }
      const [count] = await db.execute(
        'SELECT COUNT(*) AS total FROM products WHERE commerce_id = ?', [input.commerceId]
      ) as any[];
      if (Number((count as any[])[0].total) >= 500) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Limite de 500 produits atteinte.' });
      }
      const [result] = await db.execute(
        `INSERT INTO products (commerce_id, name, description, price_cents, stock, image_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.commerceId, input.name, input.description || null, input.priceCents, stock,
          input.imageUrl || null, input.isActive ? 1 : 0,
        ]
      ) as any[];
      return { id: Number((result as any).insertId) };
    }),

  // ── Commandes ──
  orders: merchantProcedure
    .input(z.object({
      commerceId,
      status: z.enum(['paid', 'preparing', 'ready', 'collected']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      await requireMembership(ctx.user, input.commerceId);
      const params: any[] = [input.commerceId];
      let sql = `SELECT id, status, total_cents AS totalCents, platform_fee_cents AS platformFeeCents,
                        note, created_at AS createdAt, paid_at AS paidAt
                 FROM orders WHERE commerce_id = ? AND status <> 'pending_payment' AND status <> 'cancelled'`;
      if (input.status) {
        sql += ' AND status = ?';
        params.push(input.status);
      }
      sql += ` ORDER BY id DESC LIMIT ${input.limit}`;
      const [orders] = await db.execute(sql, params) as any[];
      const list = orders as any[];
      if (list.length === 0) return [];

      const [items] = await db.query(
        'SELECT order_id AS orderId, name, unit_price_cents AS unitPriceCents, quantity FROM order_items WHERE order_id IN (?)',
        [list.map(order => order.id)]
      ) as any[];
      return list.map(order => ({
        ...order,
        items: (items as any[]).filter(item => item.orderId === order.id),
      }));
    }),

  setOrderStatus: merchantProcedure
    .input(z.object({
      commerceId,
      orderId: z.number().int().positive(),
      status: z.enum(['preparing', 'ready']),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user, input.commerceId);
      // paid -> preparing ; paid|preparing -> ready. L'annulation d'une commande payée se fait
      // par un remboursement dans le tableau de bord Stripe du commerçant, pas ici.
      const allowedFrom = input.status === 'preparing' ? ['paid'] : ['paid', 'preparing'];
      const [result] = await db.execute(
        `UPDATE orders SET status = ?, ready_at = IF(? = 'ready', NOW(), ready_at)
         WHERE id = ? AND commerce_id = ? AND status IN (${allowedFrom.map(() => '?').join(',')})`,
        [input.status, input.status, input.orderId, input.commerceId, ...allowedFrom]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Cette commande ne peut pas passer à ce statut.' });
      }
      return { success: true };
    }),

  // Le client présente son code de retrait ; le commerçant le saisit pour clôturer la commande.
  confirmPickup: merchantProcedure
    .input(z.object({ commerceId, pickupCode: z.string().trim().min(4).max(12) }))
    .mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user, input.commerceId);
      if (!checkRateLimit(`pickup:${ctx.user.id}`, 60, 15 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de tentatives. Réessayez dans quelques minutes.' });
      }
      const code = normalizePickupCode(input.pickupCode);
      const [result] = await db.execute(
        `UPDATE orders SET status = 'collected', collected_at = NOW()
         WHERE commerce_id = ? AND pickup_code = ? AND status IN ('paid', 'preparing', 'ready')`,
        [input.commerceId, code]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Code invalide, commande non payée ou déjà retirée.' });
      }
      return { success: true };
    }),

  // ── Administration : rattacher un compte à un commerce ──
  adminLinkMember: adminProcedure
    .input(z.object({
      commerceId,
      userEmail: z.string().trim().email().max(190),
      memberRole: z.enum(['owner', 'staff']).default('owner'),
    }))
    .mutation(async ({ ctx, input }) => {
      const [commerces] = await db.execute('SELECT id FROM commerce_catalog WHERE id = ?', [input.commerceId]) as any[];
      if ((commerces as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Commerce introuvable.' });
      }
      const [users] = await db.execute('SELECT id, role FROM users WHERE email = ? LIMIT 1', [input.userEmail.toLowerCase()]) as any[];
      const target = (users as any[])[0];
      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Aucun compte avec cet email : le commerçant doit d’abord s’inscrire.' });
      }
      await db.execute(
        `INSERT INTO commerce_members (commerce_id, user_id, member_role, created_by_user_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE member_role = VALUES(member_role)`,
        [input.commerceId, target.id, input.memberRole, ctx.user.id]
      );
      // Seul un compte « citoyen » est promu : on ne rétrograde ni ne modifie jamais un admin.
      await db.execute(`UPDATE users SET role = 'merchant' WHERE id = ? AND role = 'citizen'`, [target.id]);
      return { success: true, userId: Number(target.id) };
    }),
});
