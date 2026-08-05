const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readPublic(name) {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'public', name), 'utf8');
}

test('la landing relie les parcours citoyens, commerces et confidentialité', () => {
  const html = readPublic('landing.html');
  assert.match(html, /href="\/commerce\.html"/);
  assert.match(html, /href="\/privacy\.html"/);
  assert.match(html, /waitlist\.join/);
  assert.match(html, /privacyConsent/);
  assert.doesNotMatch(html, /mailto:[^"]*\?subject=Inscrire/i);
});

test('le portail commerce impose la modération et le consentement', () => {
  const html = readPublic('commerce.html');
  assert.match(html, /commerce\.submit/);
  assert.match(html, /consentPublication/);
  assert.match(html, /privacyConsent/);
  assert.match(html, /examinée avant toute publication/i);
});

test('la notice de confidentialité expose les droits sans prétendre à une validation juridique', () => {
  const html = readPublic('privacy.html');
  assert.match(html, /Exporter ses données|exporter ses données/i);
  assert.match(html, /effacement/i);
  assert.match(html, /doit être relue et validée/i);
});
