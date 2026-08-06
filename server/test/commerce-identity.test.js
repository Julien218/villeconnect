const test = require('node:test');
const assert = require('node:assert/strict');

const { commerceCanonicalKey } = require('../dist/routers/commerce');

test('la clé canonique ignore la casse et les espaces superflus', () => {
  const first = commerceCanonicalKey({
    name: 'Boulangerie du Centre',
    address: 'Rue Grande 12',
    postalCode: '7370',
  });
  const second = commerceCanonicalKey({
    name: '  BOULANGERIE   DU CENTRE ',
    address: ' rue grande 12 ',
    postalCode: ' 7370 ',
  });
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('une adresse ou un code postal différent produit une autre clé', () => {
  const base = commerceCanonicalKey({ name: 'Commerce Test', address: 'Rue A 1', postalCode: '7370' });
  const otherAddress = commerceCanonicalKey({ name: 'Commerce Test', address: 'Rue A 2', postalCode: '7370' });
  const otherPostal = commerceCanonicalKey({ name: 'Commerce Test', address: 'Rue A 1', postalCode: '7000' });
  assert.notEqual(base, otherAddress);
  assert.notEqual(base, otherPostal);
});
