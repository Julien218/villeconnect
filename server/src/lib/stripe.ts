// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Client minimal de l'API REST Stripe (sans SDK, donc sans nouvelle dépendance).
// Modèle : Stripe Connect avec comptes « Standard » et paiements directs (direct charges).
// L'argent est encaissé par le compte Stripe du commerçant ; VilleConnect ne reçoit que la
// commission (application_fee_amount). La clé secrète ne quitte jamais le serveur.
import { TRPCError } from '@trpc/server';
import { encodeStripeForm, FormValue } from './stripeForm';
import { CURRENCY } from './money';

const API_BASE = 'https://api.stripe.com/v1';
const REQUEST_TIMEOUT_MS = 15_000;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export class StripeApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params: { [key: string]: FormValue } = {},
  options: { account?: string; idempotencyKey?: string } = {}
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Le paiement en ligne n’est pas encore activé.',
    });
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${secret}` };
  if (options.account) headers['Stripe-Account'] = options.account;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const body = encodeStripeForm(params);
  let url = `${API_BASE}${path}`;
  const init: any = { method, headers };
  if (method === 'GET') {
    if (body) url += `?${body}`;
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = body;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init.signal = controller.signal;
  try {
    const response = await fetch(url, init);
    const json: any = await response.json().catch(() => null);
    if (!response.ok) {
      throw new StripeApiError(response.status, json?.error?.code, json?.error?.message || `HTTP ${response.status}`);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
}

/** Crée le compte Stripe Standard du commerçant (il le possède et le gère lui-même). */
export function createStandardAccount(input: { email?: string; commerceId: number }): Promise<StripeAccount> {
  return stripeRequest<StripeAccount>('POST', '/accounts', {
    type: 'standard',
    country: 'BE',
    email: input.email,
    metadata: { commerce_id: String(input.commerceId) },
  }, { idempotencyKey: `acct-commerce-${input.commerceId}` });
}

/** Lien d'inscription hébergé par Stripe : le commerçant y saisit ses informations bancaires. */
export function createAccountLink(input: {
  accountId: string; returnUrl: string; refreshUrl: string;
}): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>('POST', '/account_links', {
    account: input.accountId,
    type: 'account_onboarding',
    return_url: input.returnUrl,
    refresh_url: input.refreshUrl,
  });
}

export function retrieveAccount(accountId: string): Promise<StripeAccount> {
  return stripeRequest<StripeAccount>('GET', `/accounts/${encodeURIComponent(accountId)}`);
}

export interface CheckoutLine {
  name: string;
  unitAmountCents: number;
  quantity: number;
}

/**
 * Session de paiement hébergée par Stripe, créée SUR le compte du commerçant.
 * Les moyens de paiement (dont Bancontact) suivent la configuration du compte du commerçant.
 */
export function createCheckoutSession(input: {
  accountId: string;
  orderId: number;
  lines: CheckoutLine[];
  applicationFeeCents: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  expiresAtSeconds: number;
}): Promise<{ id: string; url: string }> {
  return stripeRequest<{ id: string; url: string }>('POST', '/checkout/sessions', {
    mode: 'payment',
    locale: 'fr',
    client_reference_id: String(input.orderId),
    customer_email: input.customerEmail,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    expires_at: input.expiresAtSeconds,
    metadata: { order_id: String(input.orderId) },
    line_items: input.lines.map(line => ({
      quantity: line.quantity,
      price_data: {
        currency: CURRENCY,
        unit_amount: line.unitAmountCents,
        product_data: { name: line.name },
      },
    })),
    payment_intent_data: {
      // Stripe refuse une commission de 0 : on l'omet dans ce cas.
      application_fee_amount: input.applicationFeeCents > 0 ? input.applicationFeeCents : undefined,
      metadata: { order_id: String(input.orderId) },
    },
  }, { account: input.accountId, idempotencyKey: `checkout-order-${input.orderId}` });
}
