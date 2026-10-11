// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
const test = require('node:test');
const assert = require('node:assert/strict');
const { findConfigProblems } = require('../dist/lib/config');

const good = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(40),
  DATABASE_URL: 'mysql://u:p@127.0.0.1:3306/db',
  CITY_HASH_SALT: 'b'.repeat(40),
  CORS_ORIGINS: 'https://villeconnectos.com',
};

test('une configuration complète est acceptée', () => {
  assert.deepEqual(findConfigProblems(good), []);
});

test('un JWT_SECRET absent, court ou resté à la valeur d’exemple est refusé', () => {
  assert.equal(findConfigProblems({ ...good, JWT_SECRET: undefined }).length, 1);
  assert.equal(findConfigProblems({ ...good, JWT_SECRET: 'court' }).length, 1);
  assert.equal(findConfigProblems({ ...good, JWT_SECRET: 'change_me_with_at_least_32_random_characters' }).length, 1);
});

test('la production exige un sel RGPD et des origines CORS', () => {
  assert.equal(findConfigProblems({ ...good, CITY_HASH_SALT: undefined }).length, 1);
  assert.equal(findConfigProblems({ ...good, CORS_ORIGINS: '' }).length, 1);
});

test('hors production, sel et CORS ne sont pas obligatoires', () => {
  assert.deepEqual(
    findConfigProblems({ NODE_ENV: 'development', JWT_SECRET: 'a'.repeat(40), DATABASE_URL: 'mysql://x' }),
    []
  );
});
