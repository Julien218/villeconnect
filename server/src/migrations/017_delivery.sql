-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 017 : livraison à domicile par le commerçant
-- MySQL 8+, idempotente (procédure stockée + information_schema). Montants en CENTIMES.
-- La commission VilleConnect reste calculée sur les produits uniquement : les frais de livraison
-- reviennent entièrement au commerçant, qui livre lui-même.

-- Réglages de livraison de chaque commerce (désactivée tant que le commerçant ne l'a pas activée).
CREATE TABLE IF NOT EXISTS commerce_delivery_settings (
  commerce_id BIGINT UNSIGNED NOT NULL,
  delivery_enabled TINYINT(1) NOT NULL DEFAULT 0,
  fee_cents INT UNSIGNED NOT NULL DEFAULT 0,
  free_from_cents INT UNSIGNED NULL,
  -- Codes postaux livrés, séparés par des virgules (ex. « 7370,7380 »).
  postal_codes VARCHAR(255) NOT NULL DEFAULT '',
  delivery_note VARCHAR(200) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (commerce_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS _vc_017_orders_delivery;

DELIMITER //
CREATE PROCEDURE _vc_017_orders_delivery()
BEGIN
  ALTER TABLE orders MODIFY COLUMN fulfillment ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivery_fee_cents'
  ) THEN
    ALTER TABLE orders
      ADD COLUMN delivery_fee_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER platform_fee_cents,
      ADD COLUMN delivery_address VARCHAR(255) NULL AFTER note,
      ADD COLUMN delivery_postal_code VARCHAR(12) NULL AFTER delivery_address,
      ADD COLUMN delivery_city VARCHAR(120) NULL AFTER delivery_postal_code,
      ADD COLUMN delivery_phone VARCHAR(40) NULL AFTER delivery_city;
  END IF;
END //
DELIMITER ;

CALL _vc_017_orders_delivery();
DROP PROCEDURE IF EXISTS _vc_017_orders_delivery;
