// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { verifyStripeSignature } = require('../dist/lib/stripeSignature');

const secret = 'whsec_test_secret_value';
const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
const now = 1_800_000_000;

function sign(payload, timestamp, key = secret) {
  return createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex');
}

test('une signature valide est acceptée', () => {
  const header = `t=${now},v1=${sign(body, now)}`;
  assert.equal(verifyStripeSignature(body, header, secret, now), true);
  assert.equal(verifyStripeSignature(Buffer.from(body), header, secret, now), true);
});

test('un corps modifié est refusé', () => {
  const header = `t=${now},v1=${sign(body, now)}`;
  assert.equal(verifyStripeSignature(body + ' ', header, secret, now), false);
});

test('un mauvais secret est refusé', () => {
  const header = `t=${now},v1=${sign(body, now, 'whsec_autre')}`;
  assert.equal(verifyStripeSignature(body, header, secret, now), false);
});

test('une requête trop ancienne (rejeu) est refusée', () => {
  const header = `t=${now},v1=${sign(body, now)}`;
  assert.equal(verifyStripeSignature(body, header, secret, now + 301), false);
  assert.equal(verifyStripeSignature(body, header, secret, now + 299), true);
});

test('les en-têtes absents ou mal formés sont refusés', () => {
  assert.equal(verifyStripeSignature(body, undefined, secret, now), false);
  assert.equal(verifyStripeSignature(body, '', secret, now), false);
  assert.equal(verifyStripeSignature(body, 't=abc,v1=zz', secret, now), false);
  assert.equal(verifyStripeSignature(body, `t=${now}`, secret, now), false);
  assert.equal(verifyStripeSignature(body, `t=${now},v1=${sign(body, now)}`, '', now), false);
});

test('plusieurs signatures v1 : une seule valide suffit', () => {
  const header = `t=${now},v1=${'0'.repeat(64)},v1=${sign(body, now)}`;
  assert.equal(verifyStripeSignature(body, header, secret, now), true);
});
