-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 012 : stations et prix carburant traçables
-- Aucun prix fictif n'est inséré par cette migration.

CREATE TABLE IF NOT EXISTS fuel_stations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  external_id VARCHAR(190) NOT NULL,
  name VARCHAR(190) NOT NULL,
  address VARCHAR(255) NOT NULL,
  postal_code VARCHAR(12) NOT NULL,
  city_name VARCHAR(120) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  price_e10 DECIMAL(6,3) NULL,
  price_e5 DECIMAL(6,3) NULL,
  price_diesel DECIMAL(6,3) NULL,
  source_name VARCHAR(120) NOT NULL,
  source_url VARCHAR(1000) NULL,
  source_updated_at DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fuel_external_source (source_name, external_id),
  KEY idx_fuel_postal_active (postal_code, is_active),
  KEY idx_fuel_freshness (source_updated_at),
  KEY idx_fuel_e10 (postal_code, price_e10),
  KEY idx_fuel_e5 (postal_code, price_e5),
  KEY idx_fuel_diesel (postal_code, price_diesel),
  CONSTRAINT chk_fuel_e10_positive CHECK (price_e10 IS NULL OR price_e10 > 0),
  CONSTRAINT chk_fuel_e5_positive CHECK (price_e5 IS NULL OR price_e5 > 0),
  CONSTRAINT chk_fuel_diesel_positive CHECK (price_diesel IS NULL OR price_diesel > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
