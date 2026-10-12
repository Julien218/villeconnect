-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 016 : commerçants, produits, commandes avec retrait, paiements Stripe
-- MySQL 8+, idempotente. Tous les montants sont en CENTIMES (entiers), jamais en décimaux.
-- Le paiement est un « direct charge » Stripe Connect : l'argent va au compte Stripe du commerçant,
-- VilleConnect ne perçoit que la commission (application_fee_amount), calculée côté serveur.

-- Un compte utilisateur réel est rattaché à un commerce du catalogue (propriétaire ou employé).
CREATE TABLE IF NOT EXISTS commerce_members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  commerce_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  member_role ENUM('owner', 'staff') NOT NULL DEFAULT 'owner',
  created_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_commerce_member (commerce_id, user_id),
  KEY idx_commerce_member_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compte Stripe Connect (type Standard) de chaque commerce. Aucune clé n'est stockée ici.
CREATE TABLE IF NOT EXISTS commerce_payment_accounts (
  commerce_id BIGINT UNSIGNED NOT NULL,
  stripe_account_id VARCHAR(64) NOT NULL,
  charges_enabled TINYINT(1) NOT NULL DEFAULT 0,
  details_submitted TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (commerce_id),
  UNIQUE KEY uq_payment_stripe_account (stripe_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  commerce_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  description VARCHAR(1000) NULL,
  price_cents INT UNSIGNED NOT NULL,
  stock INT UNSIGNED NULL,
  image_url VARCHAR(1000) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_commerce (commerce_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  commerce_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending_payment', 'paid', 'preparing', 'ready', 'collected', 'cancelled')
    NOT NULL DEFAULT 'pending_payment',
  fulfillment ENUM('pickup') NOT NULL DEFAULT 'pickup',
  subtotal_cents INT UNSIGNED NOT NULL,
  platform_fee_cents INT UNSIGNED NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  pickup_code CHAR(6) NOT NULL,
  note VARCHAR(300) NULL,
  stripe_session_id VARCHAR(120) NULL,
  stripe_payment_intent_id VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  ready_at DATETIME NULL,
  collected_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_pickup_code (commerce_id, pickup_code),
  UNIQUE KEY uq_order_stripe_session (stripe_session_id),
  KEY idx_orders_user (user_id, created_at),
  KEY idx_orders_commerce_status (commerce_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Le nom et le prix sont copiés au moment de la commande : une modification ultérieure du
-- produit ne change jamais une commande déjà passée.
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(190) NOT NULL,
  unit_price_cents INT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal des événements Stripe déjà traités (évite de rejouer deux fois le même événement).
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
