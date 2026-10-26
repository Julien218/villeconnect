// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderEmail, escapeHtml } = require('../dist/lib/emailLayout');
const { webAppUrl, isValidWebAppUrl, DEFAULT_WEB_APP_URL } = require('../dist/lib/webAppUrl');

test('WEB_APP_URL invalide : on revient à l’adresse officielle', () => {
  assert.equal(webAppUrl({ WEB_APP_URL: 'mk_1UPX2SGvzt2dC7c1MV6o29dV' }), DEFAULT_WEB_APP_URL);
  assert.equal(webAppUrl({}), DEFAULT_WEB_APP_URL);
  assert.equal(webAppUrl({ WEB_APP_URL: ' https://app.villeconnectos.com/ ' }), 'https://app.villeconnectos.com');
  assert.equal(isValidWebAppUrl('javascript:alert(1)'), false);
});

test('les e-mails de compte ont un lien absolu, cliquable et en clair', () => {
  const prev = process.env.WEB_APP_URL;
  process.env.WEB_APP_URL = 'mk_valeur_collee_par_erreur';
  try {
    const { verificationEmail, passwordResetEmail } = require('../dist/lib/auth');
    for (const email of [verificationEmail('abc123'), passwordResetEmail('abc123')]) {
      assert.match(email.html, /href="https:\/\/app\.villeconnectos\.com\/(verify-email|reset-password)\?token=abc123"/);
      assert.equal((email.html.match(/href="https:\/\/app\.villeconnectos\.com\//g) || []).length, 2); // bouton + lien en clair
      assert.match(email.text, /https:\/\/app\.villeconnectos\.com\/(verify-email|reset-password)\?token=abc123/);
      assert.ok(!email.html.includes('mk_'));
      assert.match(email.html, /TVA BE 0877\.926\.214/);
      assert.match(email.html, /logo-256\.png/);
    }
  } finally {
    if (prev === undefined) delete process.env.WEB_APP_URL; else process.env.WEB_APP_URL = prev;
  }
});

test('le contenu est échappé et les liens non http(s) sont refusés', () => {
  const email = renderEmail({ preheader: 'x', title: '<b>Dour</b>', paragraphs: ['<script>alert(1)</script>'], reason: 'r' });
  assert.ok(!email.html.includes('<script>alert(1)</script>'));
  assert.ok(email.html.includes(escapeHtml('<b>Dour</b>')));
  assert.throws(() => renderEmail({ preheader: 'x', title: 't', paragraphs: [], reason: 'r', button: { label: 'b', url: 'mk_123/verify' } }));
});

test('l’e-mail aux communes utilise la même mise en page', () => {
  const { communeEmail } = require('../dist/routers/city');
  const email = communeEmail('Dour <test>', 12, 3);
  assert.match(email.html, /logo-256\.png/);
  assert.ok(email.html.includes('Dour &lt;test&gt;'));
  assert.match(email.html, /commune\/validate\?city=3/);
  assert.ok(!/Wallet/.test(email.html));
});
