const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { db } = require('../dist/db');
const { authRouter } = require('../dist/routers/auth');
const { createPasswordResetToken, consumePasswordResetToken, sendVerificationEmail } = require('../dist/lib/auth');

test('token opaque hashé, expiration à 30 minutes, expiré/utilisé refusé', async t => {
  const now = Date.now();
  let insert;
  t.mock.method(db, 'execute', async (sql, args) => { insert = { sql, args }; return [{ insertId: 1 }]; });
  const token = await createPasswordResetToken(42);
  assert.match(token, /^[a-f0-9]{96}$/);
  assert.equal(insert.args[0], 42);
  assert.equal(insert.args[1], crypto.createHash('sha256').update(token).digest('hex'));
  assert.ok(insert.args[2].getTime() >= now + 30 * 60000);
  assert.ok(insert.args[2].getTime() <= Date.now() + 30 * 60000);
  for (const record of [undefined, { used_at: new Date(), expires_at: new Date(Date.now() + 1000) }, { used_at: null, expires_at: new Date(Date.now() - 1) }]) {
    t.mock.method(db, 'execute', async () => [[record].filter(Boolean)]);
    assert.equal(await consumePasswordResetToken('DEMO-invalid'), null);
  }
});

test('réponse publique identique compte existant/inconnu, même en échec envoi ou config', async t => {
  const previous = process.env;
  process.env = { ...previous, NODE_ENV: 'production', WEB_APP_URL: 'https://app.villeconnectos.com', RESEND_API_KEY: 'DEMO' };
  t.after(() => { process.env = previous; });
  t.mock.method(console, 'error', () => {});
  let known = false;
  let sent = 0;
  t.mock.method(db, 'execute', async sql => {
    if (sql.startsWith('SELECT id, email')) return [known ? [{ id: 42 }] : []];
    return [{ insertId: 1 }];
  });
  t.mock.method(global, 'fetch', async () => { sent++; return { ok: false, status: 503 }; });
  const caller = authRouter.createCaller({ ip: 'test-reset-flow' });
  const unknown = await caller.requestPasswordReset({ email: 'demo@example.invalid' });
  assert.equal(sent, 0);
  known = true;
  const existing = await caller.requestPasswordReset({ email: 'demo@example.invalid' });
  assert.equal(sent, 1);
  assert.deepEqual(existing, unknown);
  process.env.WEB_APP_URL = 'mk_DEMO';
  assert.deepEqual(await caller.requestPasswordReset({ email: 'demo@example.invalid' }), unknown);
  assert.equal(sent, 1);
});

test('vérification email conserve route, encodage et expiration 24h', async t => {
  const previous = process.env;
  process.env = { ...previous, NODE_ENV: 'production', WEB_APP_URL: 'https://app.villeconnectos.com/', RESEND_API_KEY: 'DEMO' };
  t.after(() => { process.env = previous; });
  let body;
  t.mock.method(global, 'fetch', async (_, options) => { body = JSON.parse(options.body); return { ok: true }; });
  assert.equal(await sendVerificationEmail('demo@example.invalid', 'DEMO &?'), true);
  assert.match(body.html, /24 heures/);
  const url = new URL(body.html.match(/href="([^"]+)"/)[1]);
  assert.equal(url.pathname, '/verify-email');
  assert.equal(url.searchParams.get('token'), 'DEMO &?');
  assert.ok(body.text.includes(url.href));
});
