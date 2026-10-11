// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computePlatformFeeCents, priceOrder, platformFeePercent, minOrderCents,
  generatePickupCode, normalizePickupCode,
} = require('../dist/lib/money');

test('la commission de 5 % est calculée en centimes entiers', () => {
  assert.equal(computePlatformFeeCents(10000, 5), 500);
  assert.equal(computePlatformFeeCents(1000, 5), 50);
  assert.equal(computePlatformFeeCents(1250, 5), 63); // 62,5 arrondi au centime supérieur
  assert.equal(computePlatformFeeCents(0, 5), 0);
});

test('la commission n’est jamais ajoutée au prix payé par le client', () => {
  const totals = priceOrder([
    { unitPriceCents: 450, quantity: 2 },
    { unitPriceCents: 1200, quantity: 1 },
  ], 5);
  assert.equal(totals.subtotalCents, 2100);
  assert.equal(totals.totalCents, 2100);
  assert.equal(totals.platformFeeCents, 105);
  assert.ok(totals.platformFeeCents < totals.totalCents);
});

test('les prix ou quantités invalides sont refusés', () => {
  assert.throws(() => priceOrder([], 5));
  assert.throws(() => priceOrder([{ unitPriceCents: 0, quantity: 1 }], 5));
  assert.throws(() => priceOrder([{ unitPriceCents: 100, quantity: 0 }], 5));
  assert.throws(() => priceOrder([{ unitPriceCents: 10.5, quantity: 1 }], 5));
  assert.throws(() => computePlatformFeeCents(-1, 5));
});

test('la commission et le minimum ont des valeurs par défaut sûres', () => {
  assert.equal(platformFeePercent({}), 5);
  assert.equal(platformFeePercent({ PLATFORM_FEE_PERCENT: '7' }), 7);
  assert.equal(platformFeePercent({ PLATFORM_FEE_PERCENT: '999' }), 5);
  assert.equal(platformFeePercent({ PLATFORM_FEE_PERCENT: 'abc' }), 5);
  assert.equal(minOrderCents({}), 1000);
  assert.equal(minOrderCents({ MIN_ORDER_CENTS: '1500' }), 1500);
});

test('le code de retrait a 6 caractères sans lettres ambiguës', () => {
  for (let i = 0; i < 200; i += 1) {
    assert.match(generatePickupCode(), /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/);
  }
  assert.equal(normalizePickupCode(' ab c 23 '), 'ABC23');
});

test('la livraison s’ajoute au total sans augmenter la commission', () => {
  const totals = priceOrder([{ unitPriceCents: 2000, quantity: 1 }], 5, 350);
  assert.equal(totals.subtotalCents, 2000);
  assert.equal(totals.deliveryFeeCents, 350);
  assert.equal(totals.totalCents, 2350);
  assert.equal(totals.platformFeeCents, 100); // 5 % des produits seulement
  assert.throws(() => priceOrder([{ unitPriceCents: 2000, quantity: 1 }], 5, -1));
  assert.throws(() => priceOrder([{ unitPriceCents: 2000, quantity: 1 }], 5, 1.5));
});

test('les frais de livraison suivent la zone et le seuil de gratuité du commerçant', () => {
  const { deliveryFeeFor, parsePostalCodes } = require('../dist/lib/money');
  assert.deepEqual(parsePostalCodes(' 7370, 7380;7370  abc 12345 7387'), ['7370', '7380', '7387']);
  assert.deepEqual(parsePostalCodes(null), []);

  const settings = { enabled: true, feeCents: 300, freeFromCents: 4000, postalCodes: ['7370', '7380'] };
  assert.equal(deliveryFeeFor(settings, 2000, '7370'), 300);
  assert.equal(deliveryFeeFor(settings, 4000, '7380'), 0);
  assert.equal(deliveryFeeFor(settings, 2000, '7000'), null);
  assert.equal(deliveryFeeFor({ ...settings, enabled: false }, 2000, '7370'), null);
  assert.equal(deliveryFeeFor({ ...settings, freeFromCents: null }, 99999, '7370'), 300);
});
