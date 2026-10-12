// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Commandes citoyennes : catalogue d'un commerce, commande avec retrait, paiement Stripe, suivi.
// Le client n'envoie JAMAIS un prix : seulement des produits et des quantités. Tout est recalculé ici.
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { db } from '../db';
import { checkRateLimit } from '../lib/auth';
import {
  DeliverySettings, MAX_ORDER_CENTS, deliveryFeeFor, generatePickupCode, minOrderCents,
  parsePostalCodes, platformFeePercent, priceOrder,
} from '../lib/money';
import { createCheckoutSession } from '../lib/stripe';

const commerceId = z.number().int().positive();
const MAX_LINES = 30;
const MAX_QUANTITY = 20;
const PICKUP_VISIBLE = ['paid', 'preparing', 'ready', 'collected'];

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

async function loadDeliverySettings(commerceId: number): Promise<DeliverySettings & { note: string | null }> {
  const [rows] = await db.execute(
    `SELECT delivery_enabled, fee_cents, free_from_cents, postal_codes, delivery_note
     FROM commerce_delivery_settings WHERE commerce_id = ?`,
    [commerceId]
  ) as any[];
  const row = (rows as any[])[0];
  if (!row) return { enabled: false, feeCents: 0, freeFromCents: null, postalCodes: [], note: null };
  return {
    enabled: Boolean(row.delivery_enabled),
    feeCents: Number(row.fee_cents),
    freeFromCents: row.free_from_cents === null ? null : Number(row.free_from_cents),
    postalCodes: parsePostalCodes(row.postal_codes),
    note: row.delivery_note || null,
  };
}

const deliveryInput = z.object({
  address: z.string().trim().min(5).max(255),
  postalCode: z.string().trim().regex(/^\d{4}$/, 'Code postal belge à 4 chiffres.'),
  city: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
});

export const ordersRouter = router({
  // Catalogue public d'un commerce publié.
  catalog: publicProcedure
    .input(z.object({ commerceId }))
    .query(async ({ input }) => {
      const [commerces] = await db.execute(
        `SELECT c.id, c.name, COALESCE(p.charges_enabled, 0) AS chargesEnabled
         FROM commerce_catalog c
         LEFT JOIN commerce_payment_accounts p ON p.commerce_id = c.id
         WHERE c.id = ? AND c.validation_status = 'approved' AND c.publication_status = 'published'`,
        [input.commerceId]
      ) as any[];
      const commerce = (commerces as any[])[0];
      if (!commerce) throw new TRPCError({ code: 'NOT_FOUND', message: 'Commerce introuvable.' });

      const [products] = await db.execute(
        `SELECT id, name, description, price_cents AS priceCents, image_url AS imageUrl,
                (stock IS NULL OR stock > 0) AS available
         FROM products WHERE commerce_id = ? AND is_active = 1 ORDER BY name ASC LIMIT 500`,
        [input.commerceId]
      ) as any[];

      const delivery = await loadDeliverySettings(input.commerceId);
      return {
        commerce: { id: Number(commerce.id), name: commerce.name },
        acceptsOnlineOrders: Boolean(commerce.chargesEnabled),
        delivery: delivery.enabled ? delivery : null,
        minOrderCents: minOrderCents(),
        products: (products as any[]).map(row => ({ ...row, available: Boolean(row.available) })),
      };
    }),

  create: protectedProcedure
    .input(z.object({
      commerceId,
      items: z.array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      })).min(1).max(MAX_LINES),
      note: z.string().trim().max(300).optional(),
      fulfillment: z.enum(['pickup', 'delivery']).default('pickup'),
      delivery: deliveryInput.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.authType !== 'access' || !ctx.user.email_verified) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Connectez-vous et vérifiez votre email pour commander.' });
      }
      if (!checkRateLimit(`order:${ctx.user.id}`, 10, 60 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de commandes. Réessayez plus tard.' });
      }
      const base = (process.env.WEB_APP_URL || '').trim().replace(/\/$/, '');
      if (!base) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Paiement indisponible pour le moment.' });

      const [commerces] = await db.execute(
        `SELECT c.id, p.stripe_account_id AS accountId, COALESCE(p.charges_enabled, 0) AS chargesEnabled
         FROM commerce_catalog c
         LEFT JOIN commerce_payment_accounts p ON p.commerce_id = c.id
         WHERE c.id = ? AND c.validation_status = 'approved' AND c.publication_status = 'published'`,
        [input.commerceId]
      ) as any[];
      const commerce = (commerces as any[])[0];
      if (!commerce) throw new TRPCError({ code: 'NOT_FOUND', message: 'Commerce introuvable.' });
      if (!commerce.accountId || !Boolean(commerce.chargesEnabled)) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Ce commerce n’accepte pas encore les paiements en ligne.' });
      }

      // Fusionne les lignes qui répètent le même produit.
      const quantities = new Map<number, number>();
      for (const item of input.items) {
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
      }
      const productIds = [...quantities.keys()];
      const [productRows] = await db.query(
        `SELECT id, name, price_cents AS priceCents, stock
         FROM products WHERE commerce_id = ? AND is_active = 1 AND id IN (?)`,
        [input.commerceId, productIds]
      ) as any[];
      const products = new Map<number, any>((productRows as any[]).map(row => [Number(row.id), row]));

      const lines: { productId: number; name: string; unitPriceCents: number; quantity: number }[] = [];
      for (const [productId, quantity] of quantities) {
        const product = products.get(productId);
        if (!product) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Un produit n’est plus disponible.' });
        }
        if (quantity > MAX_QUANTITY) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Quantité maximale par produit : ${MAX_QUANTITY}.` });
        }
        if (product.stock !== null && Number(product.stock) < quantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Stock insuffisant pour « ${product.name} ».` });
        }
        lines.push({ productId, name: product.name, unitPriceCents: Number(product.priceCents), quantity });
      }

      let deliveryFeeCents = 0;
      if (input.fulfillment === 'delivery') {
        if (!input.delivery) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Adresse de livraison manquante.' });
        }
        const settings = await loadDeliverySettings(input.commerceId);
        const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
        const fee = deliveryFeeFor(settings, subtotal, input.delivery.postalCode);
        if (fee === null) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: settings.enabled
              ? 'Ce commerce ne livre pas à ce code postal. Choisissez le retrait.'
              : 'Ce commerce ne propose pas la livraison.',
          });
        }
        deliveryFeeCents = fee;
      }

      const totals = priceOrder(lines, platformFeePercent(), deliveryFeeCents);
      // Le minimum porte sur les produits : les frais de livraison ne permettent pas de l'atteindre.
      if (totals.subtotalCents < minOrderCents()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Commande minimale : ${formatEuros(minOrderCents())}.`,
        });
      }
      if (totals.totalCents > MAX_ORDER_CENTS) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Montant de commande trop élevé.' });
      }

      const isDelivery = input.fulfillment === 'delivery';
      // Création de la commande et de ses lignes dans une seule transaction.
      const conn = await db.getConnection();
      let orderId = 0;
      try {
        await conn.beginTransaction();
        for (let attempt = 0; attempt < 5 && !orderId; attempt += 1) {
          try {
            const [result] = await conn.execute(
              `INSERT INTO orders (commerce_id, user_id, status, fulfillment, subtotal_cents,
                                   platform_fee_cents, delivery_fee_cents, total_cents, pickup_code, note,
                                   delivery_address, delivery_postal_code, delivery_city, delivery_phone)
               VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                input.commerceId, ctx.user.id, input.fulfillment, totals.subtotalCents,
                totals.platformFeeCents, totals.deliveryFeeCents, totals.totalCents,
                generatePickupCode(), input.note || null,
                isDelivery ? input.delivery!.address : null,
                isDelivery ? input.delivery!.postalCode : null,
                isDelivery ? input.delivery!.city : null,
                isDelivery ? input.delivery!.phone : null,
              ]
            ) as any[];
            orderId = Number((result as any).insertId);
          } catch (error: any) {
            // Collision du code de retrait dans ce commerce : on en tire un autre.
            if (error?.code !== 'ER_DUP_ENTRY') throw error;
          }
        }
        if (!orderId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Commande impossible, réessayez.' });

        for (const line of lines) {
          await conn.execute(
            'INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)',
            [orderId, line.productId, line.name, line.unitPriceCents, line.quantity]
          );
        }
        await conn.commit();
      } catch (error) {
        try { await conn.rollback(); } catch { /* transaction déjà terminée */ }
        throw error;
      } finally {
        conn.release();
      }

      // Création de la session de paiement (hors transaction : appel réseau externe).
      try {
        const [userRows] = await db.execute('SELECT email FROM users WHERE id = ?', [ctx.user.id]) as any[];
        const session = await createCheckoutSession({
          accountId: commerce.accountId,
          orderId,
          lines: [
            ...lines.map(line => ({ name: line.name, unitAmountCents: line.unitPriceCents, quantity: line.quantity })),
            ...(totals.deliveryFeeCents > 0
              ? [{ name: 'Livraison à domicile', unitAmountCents: totals.deliveryFeeCents, quantity: 1 }]
              : []),
          ],
          applicationFeeCents: totals.platformFeeCents,
          customerEmail: (userRows as any[])[0]?.email || undefined,
          successUrl: `${base}/orders/${orderId}?paiement=ok`,
          cancelUrl: `${base}/orders/${orderId}?paiement=annule`,
          expiresAtSeconds: Math.floor(Date.now() / 1000) + 31 * 60,
        });
        await db.execute('UPDATE orders SET stripe_session_id = ? WHERE id = ?', [session.id, orderId]);
        return { orderId, checkoutUrl: session.url, totalCents: totals.totalCents };
      } catch (error) {
        await db.execute(`UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'`, [orderId]);
        console.error(JSON.stringify({ level: 'error', scope: 'orders', message: 'session de paiement impossible', orderId }));
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Le paiement est momentanément indisponible. Réessayez plus tard.',
        });
      }
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const [rows] = await db.execute(
      `SELECT o.id, o.status, o.fulfillment, o.total_cents AS totalCents, o.created_at AS createdAt,
              c.name AS commerceName
       FROM orders o JOIN commerce_catalog c ON c.id = o.commerce_id
       WHERE o.user_id = ? AND o.status <> 'cancelled'
       ORDER BY o.id DESC LIMIT 50`,
      [ctx.user.id]
    ) as any[];
    return rows;
  }),

  get: protectedProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [rows] = await db.execute(
        `SELECT o.id, o.status, o.fulfillment, o.subtotal_cents AS subtotalCents,
                o.delivery_fee_cents AS deliveryFeeCents, o.total_cents AS totalCents,
                o.pickup_code AS pickupCode, o.note, o.delivery_address AS deliveryAddress,
                o.delivery_postal_code AS deliveryPostalCode, o.delivery_city AS deliveryCity,
                o.created_at AS createdAt, o.paid_at AS paidAt, o.ready_at AS readyAt,
                c.name AS commerceName, c.address AS commerceAddress, c.phone AS commercePhone
         FROM orders o JOIN commerce_catalog c ON c.id = o.commerce_id
         WHERE o.id = ? AND o.user_id = ?`,
        [input.orderId, ctx.user.id]
      ) as any[];
      const order = (rows as any[])[0];
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Commande introuvable.' });

      const [items] = await db.execute(
        'SELECT name, unit_price_cents AS unitPriceCents, quantity FROM order_items WHERE order_id = ?',
        [input.orderId]
      ) as any[];
      return {
        ...order,
        // Le code de retrait n'est révélé qu'une fois la commande payée.
        pickupCode: PICKUP_VISIBLE.includes(order.status) ? order.pickupCode : null,
        items,
      };
    }),

  // Seule une commande non payée peut être annulée ici ; après paiement, le commerçant rembourse via Stripe.
  cancelMine: protectedProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.execute(
        `UPDATE orders SET status = 'cancelled'
         WHERE id = ? AND user_id = ? AND status = 'pending_payment'`,
        [input.orderId, ctx.user.id]
      ) as any[];
      if (Number((result as any).affectedRows) !== 1) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Cette commande ne peut plus être annulée ici.' });
      }
      return { success: true };
    }),
});
