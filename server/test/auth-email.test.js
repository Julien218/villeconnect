const test = require('node:test');
const assert = require('node:assert/strict');
const { webAppOrigin, authLink, passwordResetEmail, sendPasswordResetEmail, PASSWORD_RESET_TTL_MINUTES } = require('../dist/lib/auth-email');
const { findConfigProblems } = require('../dist/lib/config');
const env = { NODE_ENV: 'production', WEB_APP_URL: 'https://app.villeconnectos.com' };
const demoToken = 'DEMO-NON-VALID-token +&<"\'/é?=#';

test('URL absolue canonique, espaces externes et slash final normalisés', () => {
  assert.equal(webAppOrigin({ ...env, WEB_APP_URL: ' https://app.villeconnectos.com/ ' }), env.WEB_APP_URL);
  const link = new URL(authLink('/reset-password', demoToken, env));
  assert.equal(link.origin, env.WEB_APP_URL);
  assert.equal(link.pathname, '/reset-password');
  assert.equal(link.searchParams.get('token'), demoToken);
  assert.equal([...link.searchParams].length, 1);
  assert.equal(link.hash, '');
});

for (const value of [undefined, '', ' ', 'mk_DEMO_INVALID', '/relative', '//evil.example', 'javascript:alert(1)',
  'http://app.villeconnectos.com', 'https://user:secret@app.villeconnectos.com', 'https://app.villeconnectos.com/subpath',
  'https://app.villeconnectos.com?next=evil', 'https://app.villeconnectos.com#fragment', 'https://local',
  'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://10.0.0.1', 'https://api.railway.internal',
  'https://app.villeconnectos.com\\@evil.example', 'https://app. villeconnectos.com']) {
  test(`configuration invalide refusée (cas ${String(value).length}/${String(value).slice(0, 12)})`, () => {
    assert.throws(() => webAppOrigin({ ...env, WEB_APP_URL: value }), /WEB_APP_URL/);
    const problems = findConfigProblems({ ...env, WEB_APP_URL: value, RESEND_API_KEY: 'demo' });
    assert.ok(problems.some(p => p.startsWith('WEB_APP_URL')));
    if (value?.includes('secret') || value?.startsWith('mk_')) assert.ok(!problems.join().includes(value));
  });
}

test('HTTP limité au loopback hors production; défaut uniquement hors production', () => {
  assert.equal(webAppOrigin({ NODE_ENV: 'development', WEB_APP_URL: 'http://localhost:8081/' }), 'http://localhost:8081');
  assert.equal(webAppOrigin({ NODE_ENV: 'test' }), env.WEB_APP_URL);
  assert.throws(() => webAppOrigin({ NODE_ENV: 'test', WEB_APP_URL: 'http://evil.example' }));
  assert.throws(() => authLink('/reset-password', '', env));
});

test('HTML accessible, bouton et secours identiques au texte; encodage sans injection', () => {
  const message = passwordResetEmail(demoToken, env);
  const links = [...message.html.matchAll(/<a href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
  assert.equal(links.length, 2);
  assert.equal(links[0], links[1]);
  assert.equal(new URL(links[0]).searchParams.get('token'), demoToken);
  assert.ok(message.text.includes(links[0]));
  assert.ok(!message.html.includes(demoToken));
  assert.match(message.html, /<!DOCTYPE html>/);
  assert.match(message.html, /<html lang="fr"/);
  assert.match(message.html, /name="viewport"/);
  assert.match(message.html, /alt="VilleConnect OS"/);
  assert.match(message.html, /\[if mso\]/);
  assert.match(message.html, /max-width:600px/);
  assert.doesNotMatch(message.html, /<button|<script|<form|<style|display:flex|display:grid/);
  assert.ok([...message.html.matchAll(/<table\b[^>]*>/g)].every(m => /role="presentation"/.test(m[0])));
  assert.equal(PASSWORD_RESET_TTL_MINUTES, 30);
  for (const content of [message.html, message.text]) {
    assert.match(content, /30 minutes/);
    assert.match(content, /mot de passe reste inchangé/);
  }
});

test('payload Resend réel simulé: HTML + texte, rejet config et erreurs sans secrets', async t => {
  const previousEnv = process.env;
  process.env = { ...process.env, ...env, RESEND_API_KEY: 'DEMO-KEY' };
  t.after(() => { process.env = previousEnv; });
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args.join(' ')));
  const requests = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true };
  });
  assert.equal(await sendPasswordResetEmail('recipient@example.invalid', demoToken), true);
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.equal(requests[0].options.headers['Content-Type'], 'application/json');
  assert.equal(requests[0].body.from, 'VilleConnect OS <noreply@villeconnectos.com>');
  assert.deepEqual(requests[0].body.to, ['recipient@example.invalid']);
  assert.deepEqual(requests[0].body.html, passwordResetEmail(demoToken, env).html);
  assert.deepEqual(requests[0].body.text, passwordResetEmail(demoToken, env).text);
  process.env.WEB_APP_URL = 'mk_DEMO';
  assert.equal(await sendPasswordResetEmail('recipient@example.invalid', demoToken), false);
  assert.equal(requests.length, 1);
  process.env.WEB_APP_URL = env.WEB_APP_URL;
  t.mock.method(global, 'fetch', async () => ({ ok: false, status: 422, text() { throw Error(demoToken); } }));
  assert.equal(await sendPasswordResetEmail('recipient@example.invalid', demoToken), false);
  t.mock.method(global, 'fetch', async () => { throw Error(demoToken + ' recipient@example.invalid DEMO-KEY'); });
  assert.equal(await sendPasswordResetEmail('recipient@example.invalid', demoToken), false);
  delete process.env.RESEND_API_KEY;
  assert.equal(await sendPasswordResetEmail('recipient@example.invalid', demoToken), false);
  assert.doesNotMatch(errors.join(' '), /DEMO|recipient|token=/);
});
