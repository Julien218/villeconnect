// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(48);
const { normalizeSports } = require('../dist/routers/sport');

test('les disciplines sont nettoyées, dédoublonnées et limitées', () => {
  assert.deepEqual(normalizeSports(' football, Futsal ,Football,  tennis de  table '), ['Football', 'Futsal', 'Tennis de table']);
  assert.deepEqual(normalizeSports(['x', '', 'Judo']), ['Judo']);
  assert.equal(normalizeSports(Array.from({ length: 20 }, (_, i) => `Sport ${i}`)).length, 8);
});

test('la migration Sport ne publie aucune fiche par défaut', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'migrations', '018_sport_places.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS sport_places/i);
  assert.match(sql, /status ENUM\('pending', 'published', 'rejected', 'archived'\) NOT NULL DEFAULT 'pending'/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+sport_places/i);
});
