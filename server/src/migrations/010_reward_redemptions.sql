-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 010 : échanges de récompenses CivicLoop
-- Idempotente et compatible MySQL 8+

CREATE TABLE IF NOT EXISTS merchant_shops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  access_role ENUM('owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_merchant_shop (user_id, shop_id),
  KEY idx_merchant_shops_shop (shop_id, is_active),
  KEY idx_merchant_shops_user (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  reward_id INT NOT NULL,
  shop_id INT NULL,
  reward_title VARCHAR(190) NOT NULL,
  credits_spent INT NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  idempotency_key VARCHAR(64) NOT NULL,
  token_nonce CHAR(32) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  confirmed_at DATETIME NULL,
  confirmed_by_user_id INT NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_redemption_idempotency (user_id, idempotency_key),
  UNIQUE KEY uq_redemption_token_hash (token_hash),
  KEY idx_redemptions_user_status (user_id, status, created_at),
  KEY idx_redemptions_shop_status (shop_id, status, created_at),
  KEY idx_redemptions_expiry (status, expires_at),
  CONSTRAINT chk_redemption_credits_positive CHECK (credits_spent > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
