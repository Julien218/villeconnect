const test = require('node:test');
const assert = require('node:assert/strict');
const { fuelRouter } = require('../dist/routers/fuel');
const { db } = require('../dist/db');

const caller = fuelRouter.createCaller({});

test('la recherche géolocalisée filtre le rayon avant le tri prix et la limite', async t => {
  const execute = t.mock.method(db, 'execute', async (sql, args) => {
    assert.match(sql, /ASIN/);
    assert.match(sql, /latitude BETWEEN -90 AND 90/);
    assert.doesNotMatch(sql, /postal_code = \?/);
    assert.match(sql, /HAVING distanceKm <= \?[\s\S]*ORDER BY price_diesel ASC, distanceKm ASC[\s\S]*LIMIT 20/);
    assert.deepEqual(args, [50.4, 50.4, 3.8, 10]);
    return [[{ id: 1, latitude: '50.4', longitude: '3.8', distanceKm: '0.250', priceDiesel: '1.600', sourceUpdatedAt: '2026-09-20T10:00:00Z' }]];
  });
  const result = await caller.getStations({ latitude: 50.4, longitude: 3.8, radiusKm: 10, fuelType: 'DIESEL', limit: 20 });
  assert.equal(execute.mock.callCount(), 1);
  assert.equal(result.status, 'available');
  assert.equal(result.items[0].distanceKm, 0.25);
  assert.equal(result.items[0].priceDiesel, 1.6);
});

test('les anciens appels par code postal restent compatibles', async t => {
  t.mock.method(db, 'execute', async (sql, args) => {
    assert.match(sql, /NULL AS distanceKm/);
    assert.match(sql, /postal_code = \?/);
    assert.doesNotMatch(sql, /HAVING/);
    assert.deepEqual(args, ['7000']);
    return [[]];
  });
  const result = await caller.getStations({ postalCode: '7000' });
  assert.equal(result.status, 'empty');
  assert.deepEqual(result.items, []);
});

test('les coordonnées nulles au sens géographique (0, 0) restent valides', async t => {
  t.mock.method(db, 'execute', async (sql, args) => {
    assert.match(sql, /HAVING distanceKm/);
    assert.deepEqual(args, [0, 0, 0, 10]);
    return [[]];
  });
  assert.equal((await caller.getStations({ latitude: 0, longitude: 0 })).status, 'empty');
});

for (const input of [
  { latitude: 50 }, { longitude: 3 }, { latitude: 91, longitude: 3 },
  { latitude: 50, longitude: 181 }, { latitude: 50, longitude: 3, radiusKm: 0 },
  { latitude: 50, longitude: 3, radiusKm: 51 }, { latitude: 50, longitude: 3, radiusKm: 5.5 },
]) {
  test(`rejet des paramètres de proximité invalides : ${JSON.stringify(input)}`, async t => {
    const execute = t.mock.method(db, 'execute', async () => { throw new Error('Ne doit pas être appelé'); });
    await assert.rejects(caller.getStations(input), error => error.code === 'BAD_REQUEST');
    assert.equal(execute.mock.callCount(), 0);
  });
}
