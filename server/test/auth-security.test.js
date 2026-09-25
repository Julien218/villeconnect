const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { db } = require('../dist/db');
const { getOrCreateUserId } = require('../dist/lib/users');
const { createContext, router, protectedProcedure, adminProcedure } = require('../dist/trpc');

const guest = { id: 42, openId: 'guest-test-identifier', role: 'citizen', email: null,
  password_hash: null, loginMethod: 'anonymous', is_active: 1, merged_into_user_id: null };
const context = { user: { id: 42, openId: guest.openId, role: 'citizen', email_verified: false, authType: 'device' } };

async function withUser(user, action) {
  const original = db.execute;
  db.execute = async () => [[user]];
  try { await action(); } finally { db.execute = original; }
}

test('un invité actif reste compatible', async () => {
  await withUser(guest, async () => {
    assert.deepEqual(await getOrCreateUserId(guest.openId), { id: 42, role: 'citizen' });
    const caller = router({ probe: protectedProcedure.query(({ ctx }) => ctx.user.id) }).createCaller(context);
    assert.equal(await caller.probe(), 42);
  });
});

test('un openId ne permet pas de récupérer un compte, un rôle privilégié ou un compte désactivé', async () => {
  for (const change of [
    { email: 'account@example.invalid' }, { password_hash: 'hash' }, { role: 'admin' },
    { loginMethod: 'password' }, { is_active: 0 }, { merged_into_user_id: 10 },
  ]) {
    await withUser({ ...guest, ...change }, async () => {
      await assert.rejects(() => getOrCreateUserId(guest.openId), { code: 'UNAUTHORIZED' });
      const caller = router({ probe: protectedProcedure.query(() => true) }).createCaller(context);
      await assert.rejects(() => caller.probe(), { code: 'UNAUTHORIZED' });
    });
  }
});

test('un ancien JWT admin ne conserve pas un rôle retiré en base', async () => {
  await withUser({ ...guest, email: 'account@example.invalid', loginMethod: 'password' }, async () => {
    const caller = router({ probe: adminProcedure.query(() => true) }).createCaller({
      user: { ...context.user, authType: 'access', role: 'admin' },
    });
    await assert.rejects(() => caller.probe(), { code: 'FORBIDDEN' });
  });
});

test('les en-têtes X-Forwarded-For bruts ne remplacent pas req.ip', () => {
  assert.equal(createContext({ ip: '192.0.2.1', headers: { 'x-forwarded-for': 'attacker' } }).ip, '192.0.2.1');
});

test('seuls les JWT HS256 avec identité et type valides sont acceptés', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-signing-key-not-a-real-app-secret';
  try {
    const payload = { sub: 42, openId: guest.openId, type: 'access' };
    const request = token => ({ headers: { authorization: `Bearer ${token}` } });
    assert.equal(createContext(request(jwt.sign(payload, process.env.JWT_SECRET))).user.id, 42);
    for (const token of [
      jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS384' }),
      jwt.sign({ ...payload, type: 'other' }, process.env.JWT_SECRET),
      jwt.sign({ ...payload, sub: 'not-a-number' }, process.env.JWT_SECRET),
      jwt.sign(payload, 'different-test-key'),
    ]) assert.equal(createContext(request(token)).user, undefined);
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});
