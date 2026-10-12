// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeStripeForm } = require('../dist/lib/stripeForm');

test('les objets et tableaux imbriqués utilisent la notation à crochets', () => {
  const body = encodeStripeForm({
    mode: 'payment',
    line_items: [{ quantity: 2, price_data: { currency: 'eur', unit_amount: 450 } }],
    payment_intent_data: { application_fee_amount: 45 },
  });
  const decoded = decodeURIComponent(body);
  assert.match(decoded, /mode=payment/);
  assert.match(decoded, /line_items\[0\]\[quantity\]=2/);
  assert.match(decoded, /line_items\[0\]\[price_data\]\[currency\]=eur/);
  assert.match(decoded, /line_items\[0\]\[price_data\]\[unit_amount\]=450/);
  assert.match(decoded, /payment_intent_data\[application_fee_amount\]=45/);
});

test('les valeurs vides sont ignorées et les caractères spéciaux encodés', () => {
  const body = encodeStripeForm({ a: undefined, b: null, c: 'x&y=z é', d: false, e: 0 });
  assert.doesNotMatch(body, /a=|b=/);
  assert.match(body, /c=x%26y%3Dz%20%C3%A9/);
  assert.match(body, /d=false/);
  assert.match(body, /e=0/);
});
