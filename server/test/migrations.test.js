const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readMigration(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'src', 'migrations', name), 'utf8');
}

test('la migration Wallet crée les deux tables attendues sans secret', () => {
  const sql = readMigration('010_reward_redemptions.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS merchant_shops/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS reward_redemptions/i);
  assert.match(sql, /UNIQUE KEY uq_redemption_idempotency/i);
  assert.doesNotMatch(sql, /(password|secret|token\s*=)/i);
});

test('la migration commerce impose modération et déduplication', () => {
  const sql = readMigration('011_commerce_catalog.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS commerce_catalog/i);
  assert.match(sql, /UNIQUE KEY uq_commerce_canonical_key/i);
  assert.match(sql, /validation_status ENUM\('pending', 'approved', 'rejected'\)/i);
  assert.match(sql, /publication_status ENUM\('draft', 'published', 'suspended', 'archived'\)/i);
  assert.match(sql, /ON DUPLICATE KEY UPDATE/i);
});

test('la migration carburant exige une source et n’insère aucun prix fictif', () => {
  const sql = readMigration('012_fuel_stations.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS fuel_stations/i);
  assert.match(sql, /source_name VARCHAR\(120\) NOT NULL/i);
  assert.match(sql, /source_updated_at DATETIME NOT NULL/i);
  assert.match(sql, /UNIQUE KEY uq_fuel_external_source/i);
  assert.doesNotMatch(sql, /INSERT\s+INTO\s+fuel_stations/i);
  assert.doesNotMatch(sql, /(Colruyt|Carrefour|Statbel)/i);
});
