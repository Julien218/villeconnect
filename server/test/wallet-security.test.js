const test = require('node:test');
const assert = require('node:assert/strict');

process.env.WALLET_QR_SECRET = 'test-only-wallet-secret-32-characters-minimum';
const { walletTestUtils } = require('../dist/routers/wallet');

test('un QR CivicLoop signé peut être vérifié sans exposer le secret', () => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const nonce = '0123456789abcdef0123456789abcdef';
  const token = walletTestUtils.buildRedemptionToken(42, nonce, expiresAt);
  const parsed = walletTestUtils.parseAndVerifyRedemptionToken(token);

  assert.equal(parsed.id, 42);
  assert.equal(parsed.nonce, nonce);
  assert.match(token, /^vc1\.42\.[a-f0-9]{32}\.\d+\.[A-Za-z0-9_-]+$/);
  assert.equal(token.includes(process.env.WALLET_QR_SECRET), false);
});

test('un QR modifié est rejeté', () => {
  const nonce = 'fedcba9876543210fedcba9876543210';
  const token = walletTestUtils.buildRedemptionToken(7, nonce, new Date(Date.now() + 60_000));
  const tampered = token.replace('vc1.7.', 'vc1.8.');
  assert.throws(() => walletTestUtils.parseAndVerifyRedemptionToken(tampered));
});

test('la génération refuse l’absence de secret Wallet dédié', () => {
  const previous = process.env.WALLET_QR_SECRET;
  delete process.env.WALLET_QR_SECRET;
  assert.throws(() => walletTestUtils.buildRedemptionToken(
    1,
    '0123456789abcdef0123456789abcdef',
    new Date(Date.now() + 60_000)
  ));
  process.env.WALLET_QR_SECRET = previous;
});
