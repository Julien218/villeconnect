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

test('la migration RGPD trace les demandes sans stocker de mot de passe', () => {
  const sql = readMigration('013_privacy_requests.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS privacy_requests/i);
  assert.match(sql, /request_type ENUM\('export', 'erasure'\)/i);
  assert.match(sql, /created_ip_hash CHAR\(64\)/i);
  assert.doesNotMatch(sql, /password/i);
});

test('la migration liste d’attente conserve une preuve de consentement versionnée', () => {
  const sql = readMigration('014_waitlist_consents.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS waitlist_consents/i);
  assert.match(sql, /policy_version VARCHAR\(40\) NOT NULL/i);
  assert.match(sql, /UNIQUE KEY uq_waitlist_consent_version/i);
  assert.match(sql, /ip_hash CHAR\(64\)/i);
});

test('la migration organisateurs lie un compte réel à une fiche et sépare la confiance', () => {
  const sql = readMigration('015_event_organizers.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS event_organizers/i);
  assert.match(sql, /UNIQUE KEY uq_event_organizer_user \(user_id\)/i);
  assert.match(sql, /trusted TINYINT\(1\) NOT NULL DEFAULT 0/i);
  assert.match(sql, /organizer_type ENUM\('asbl', 'commune', 'commerce', 'autre'\)/i);
  assert.doesNotMatch(sql, /(password|secret)/i);
});

test('la publication directe exige une fiche de confiance et un email vérifié', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'routers', 'events.ts'), 'utf8');
  assert.match(src, /submitAsOrganizer: protectedProcedure/);
  assert.match(src, /Boolean\(organizer\.trusted\) && ctx\.user\.email_verified/);
});

test('la migration commandes stocke les montants en centimes entiers et empêche les doublons', () => {
  const sql = readMigration('016_shop_orders.sql');
  for (const table of ['commerce_members', 'commerce_payment_accounts', 'products', 'orders', 'order_items', 'stripe_events']) {
    assert.match(sql, new RegExp('CREATE TABLE IF NOT EXISTS ' + table, 'i'));
  }
  assert.match(sql, /price_cents INT UNSIGNED NOT NULL/i);
  assert.match(sql, /platform_fee_cents INT UNSIGNED NOT NULL/i);
  assert.match(sql, /UNIQUE KEY uq_order_pickup_code \(commerce_id, pickup_code\)/i);
  assert.match(sql, /UNIQUE KEY uq_order_stripe_session \(stripe_session_id\)/i);
  assert.doesNotMatch(sql, /DECIMAL|FLOAT|DOUBLE/i);
  assert.doesNotMatch(sql, /(sk_live|sk_test|whsec_)/i);
});

test('le webhook Stripe reçoit le corps brut avant express.json et vérifie la signature', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf8');
  const rawPos = index.indexOf("app.post('/webhooks/stripe'");
  const jsonPos = index.indexOf('app.use(express.json');
  assert.ok(rawPos > 0 && jsonPos > rawPos, 'la route webhook doit précéder express.json()');
  const handler = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'stripeWebhook.ts'), 'utf8');
  assert.match(handler, /verifyStripeSignature/);
});

test('la commande ne reçoit jamais de prix du client', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'routers', 'orders.ts'), 'utf8');
  const input = src.slice(src.indexOf('create: protectedProcedure'), src.indexOf('.mutation(async ({ ctx, input }) => {\n      if (ctx.user.authType'));
  assert.doesNotMatch(input, /price|amount|total/i);
});
