// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Réception des webhooks Stripe Connect. La route doit recevoir le corps BRUT (express.raw),
// car la signature se calcule sur les octets exacts envoyés par Stripe.
import { db } from '../db';
import { CURRENCY } from '../lib/money';
import { verifyStripeSignature } from '../lib/stripeSignature';

function log(level: 'info' | 'error', message: string, extra: Record<string, unknown> = {}) {
  // Aucune donnée personnelle dans les journaux : uniquement des identifiants techniques.
  console[level === 'error' ? 'error' : 'log'](JSON.stringify({ level, scope: 'stripe-webhook', message, ...extra }));
}

async function markOrderPaid(session: any, connectedAccount: string | undefined): Promise<void> {
  const orderId = Number(session?.metadata?.order_id || session?.client_reference_id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    log('error', 'order_id manquant dans la session', { sessionId: session?.id });
    return;
  }
  if (session.payment_status !== 'paid') return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT id, commerce_id, status, total_cents FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    ) as any[];
    const order = (rows as any[])[0];
    if (!order) {
      await conn.rollback();
      log('error', 'commande introuvable', { orderId });
      return;
    }
    // Déjà traitée (Stripe peut renvoyer un événement) : rien à refaire.
    if (order.status !== 'pending_payment') {
      await conn.commit();
      return;
    }

    const [accounts] = await conn.execute(
      'SELECT stripe_account_id FROM commerce_payment_accounts WHERE commerce_id = ?',
      [order.commerce_id]
    ) as any[];
    const expectedAccount = (accounts as any[])[0]?.stripe_account_id;
    if (!expectedAccount || !connectedAccount || connectedAccount !== expectedAccount) {
      await conn.rollback();
      log('error', 'compte Stripe différent du commerce de la commande', { orderId });
      return;
    }
    if (
      Number(session.amount_total) !== Number(order.total_cents) ||
      String(session.currency || '').toLowerCase() !== CURRENCY
    ) {
      await conn.rollback();
      log('error', 'montant payé différent du montant de la commande', { orderId });
      return;
    }

    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
    await conn.execute(
      `UPDATE orders SET status = 'paid', paid_at = NOW(), stripe_payment_intent_id = ?
       WHERE id = ? AND status = 'pending_payment'`,
      [paymentIntent, orderId]
    );

    const [items] = await conn.execute(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    ) as any[];
    for (const item of items as any[]) {
      await conn.execute(
        `UPDATE products SET stock = GREATEST(CAST(stock AS SIGNED) - ?, 0)
         WHERE id = ? AND commerce_id = ? AND stock IS NOT NULL`,
        [item.quantity, item.product_id, order.commerce_id]
      );
    }
    await conn.commit();
    log('info', 'commande payée', { orderId });
  } catch (error) {
    try { await conn.rollback(); } catch { /* transaction déjà terminée */ }
    throw error;
  } finally {
    conn.release();
  }
}

async function cancelPendingOrder(session: any): Promise<void> {
  const orderId = Number(session?.metadata?.order_id || session?.client_reference_id);
  if (!Number.isInteger(orderId) || orderId <= 0) return;
  await db.execute(
    `UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'`,
    [orderId]
  );
}

async function syncAccount(account: any): Promise<void> {
  if (!account?.id) return;
  await db.execute(
    `UPDATE commerce_payment_accounts SET charges_enabled = ?, details_submitted = ?
     WHERE stripe_account_id = ?`,
    [account.charges_enabled ? 1 : 0, account.details_submitted ? 1 : 0, account.id]
  );
}

export async function stripeWebhookHandler(req: any, res: any): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Webhook non configuré' });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: 'Corps brut attendu' });
    return;
  }
  if (!verifyStripeSignature(req.body, req.headers['stripe-signature'] as string | undefined, secret)) {
    res.status(400).json({ error: 'Signature invalide' });
    return;
  }

  let event: any;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'JSON invalide' });
    return;
  }
  if (!event?.id || !event?.type) {
    res.status(400).json({ error: 'Événement invalide' });
    return;
  }

  try {
    const [seen] = await db.execute('SELECT 1 FROM stripe_events WHERE event_id = ? LIMIT 1', [event.id]) as any[];
    if ((seen as any[]).length > 0) {
      res.json({ received: true, duplicate: true });
      return;
    }

    const object = event.data?.object;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await markOrderPaid(object, event.account);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await cancelPendingOrder(object);
        break;
      case 'account.updated':
        await syncAccount(object);
        break;
      default:
        break; // Les autres événements sont acceptés mais ignorés.
    }

    // Enregistré APRÈS le traitement : en cas d'erreur, Stripe renverra l'événement.
    await db.execute('INSERT IGNORE INTO stripe_events (event_id, event_type) VALUES (?, ?)', [event.id, event.type]);
    res.json({ received: true });
  } catch (error) {
    log('error', 'échec du traitement', { eventId: event.id, type: event.type, message: (error as Error).message });
    res.status(500).json({ error: 'Traitement impossible' });
  }
}
