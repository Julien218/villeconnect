// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rules = require('../dist/lib/communityRules');

test('les objets interdits sont refusés, les mots voisins non', () => {
  assert.equal(rules.findForbiddenTerm('Vends fusil de chasse'), 'fusil');
  assert.equal(rules.findForbiddenTerm('Chiots à donner'), 'chiots');
  assert.equal(rules.findForbiddenTerm('MÉDICAMENT périmé'), 'médicament');
  assert.equal(rules.findForbiddenTerm('Échelle 3 mètres'), null);
  assert.equal(rules.findForbiddenTerm('Visseuse sans fil, état neuf'), null);
});

test('téléphones et emails sont masqués dans le texte public', () => {
  const out = rules.redactContacts('Appelez le 0475 12 34 56 ou écrivez à jean@exemple.be');
  assert.doesNotMatch(out, /0475/);
  assert.doesNotMatch(out, /@/);
  assert.match(out, /messagerie/);
  assert.equal(rules.redactContacts('Échelle 3 m, 25 € par jour'), 'Échelle 3 m, 25 € par jour');
});

test('les règles de prix dépendent du type d’annonce', () => {
  const base = { title: 'Échelle aluminium', description: 'Échelle de 3 mètres en bon état.' };
  assert.throws(() => rules.cleanListing({ ...base, kind: 'sell' }), /prix/i);
  assert.deepEqual(
    (({ priceCents, priceUnit }) => ({ priceCents, priceUnit }))(rules.cleanListing({ ...base, kind: 'sell', priceCents: 2000 })),
    { priceCents: 2000, priceUnit: 'fixed' });
  assert.equal(rules.cleanListing({ ...base, kind: 'lend' }).priceCents, null);
  assert.equal(rules.cleanListing({ ...base, kind: 'lend', priceCents: 500 }).priceUnit, 'per_day');
  assert.equal(rules.cleanListing({ ...base, kind: 'give', priceCents: 900 }).priceCents, null);
  assert.throws(() => rules.cleanListing({ ...base, kind: 'sell', priceCents: 99999999 }), /prix/i);
  assert.throws(() => rules.cleanListing({ title: 'ab', description: 'x'.repeat(20), kind: 'give' }), /titre/i);
  assert.throws(() => rules.cleanListing({ ...base, kind: 'give', description: 'Je donne des chiots adorables' }), /non autoris/i);
});

test('confiance, expiration et nom public', () => {
  assert.equal(rules.isTrustedAuthor({ published: 2, removedOrRejected: 0 }), true);
  assert.equal(rules.isTrustedAuthor({ published: 5, removedOrRejected: 1 }), false);
  assert.equal(rules.isTrustedAuthor({ published: 1, removedOrRejected: 0 }), false);
  const now = new Date('2026-10-12T00:00:00Z');
  assert.equal(rules.listingExpiry(now).toISOString(), '2026-11-11T00:00:00.000Z');
  assert.equal(rules.publicName('Julien Pagin'), 'Julien P.');
  assert.equal(rules.publicName(null), 'Voisin');
  assert.throws(() => rules.cleanMessage('   '), /vide/i);
  assert.throws(() => rules.cleanMessage('x'.repeat(1001)), /long/i);
});

test('la migration communautaire ne publie aucun contenu et publie par défaut en attente', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'migrations', '020_community.sql'), 'utf8');
  assert.match(sql, /status ENUM\('pending', 'published', 'closed', 'rejected', 'removed'\) NOT NULL DEFAULT 'pending'/i);
  assert.match(sql, /UNIQUE KEY uq_conversation \(listing_id, requester_id\)/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO/i);
});

const { parseVerdict, aiModerationEnabled } = require('../dist/lib/aiModeration');

test('le verdict de l’IA est validé ; toute anomalie renvoie vers une vérification humaine', () => {
  assert.deepEqual(parseVerdict('{"verdict":"approve","reason":"Annonce ordinaire"}'), { verdict: 'approve', reason: 'Annonce ordinaire' });
  assert.equal(parseVerdict('Voici : {"verdict":"reject","reason":"arme"} merci').verdict, 'reject');
  for (const bad of ['', 'pas de json', '{"verdict":"publish"}', '{"verdict":', '{"reason":"x"}', '{"verdict":["approve"]}']) {
    assert.equal(parseVerdict(bad).verdict, 'review', bad);
  }
  assert.ok(parseVerdict('{"verdict":"approve","reason":"' + 'x'.repeat(500) + '"}').reason.length <= 200);
});

test('l’IA est désactivée sans clé ou sans activation explicite', () => {
  const saved = { a: process.env.ANTHROPIC_API_KEY, b: process.env.COMMUNITY_AI };
  delete process.env.ANTHROPIC_API_KEY; delete process.env.COMMUNITY_AI;
  assert.equal(aiModerationEnabled(), false);
  process.env.COMMUNITY_AI = '1';
  assert.equal(aiModerationEnabled(), false);
  process.env.ANTHROPIC_API_KEY = 'sk-test';
  assert.equal(aiModerationEnabled(), true);
  process.env.ANTHROPIC_API_KEY = saved.a ?? ''; if (saved.a === undefined) delete process.env.ANTHROPIC_API_KEY;
  if (saved.b === undefined) delete process.env.COMMUNITY_AI; else process.env.COMMUNITY_AI = saved.b;
});
