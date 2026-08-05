-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 011 : catalogue canonique des commerces
-- MySQL 8+, idempotente. Les nouvelles soumissions restent pending/draft.

CREATE TABLE IF NOT EXISTS commerce_catalog (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  canonical_key CHAR(64) NOT NULL,
  legacy_shop_id INT NULL,
  city_id INT NULL,
  name VARCHAR(190) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Commerce',
  description TEXT NULL,
  address VARCHAR(255) NOT NULL,
  postal_code VARCHAR(12) NOT NULL,
  city_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  website VARCHAR(500) NULL,
  image_url VARCHAR(1000) NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  has_promotion TINYINT(1) NOT NULL DEFAULT 0,
  promotion_text VARCHAR(255) NULL,
  validation_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  publication_status ENUM('draft', 'published', 'suspended', 'archived') NOT NULL DEFAULT 'draft',
  source ENUM('landing', 'backoffice', 'import', 'legacy') NOT NULL,
  consent_publication TINYINT(1) NOT NULL DEFAULT 0,
  submitted_by_user_id INT NULL,
  reviewed_by_user_id INT NULL,
  reviewed_at DATETIME NULL,
  published_at DATETIME NULL,
  rejection_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_commerce_canonical_key (canonical_key),
  UNIQUE KEY uq_commerce_legacy_shop (legacy_shop_id),
  KEY idx_commerce_public (postal_code, validation_status, publication_status, name),
  KEY idx_commerce_review (validation_status, publication_status, created_at),
  KEY idx_commerce_city (city_id, publication_status),
  KEY idx_commerce_source (source, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reprise idempotente des commerces historiques déjà actifs et déjà affichés par l'application.
-- Ils conservent leur visibilité actuelle et sont identifiés comme source legacy.
INSERT INTO commerce_catalog (
  canonical_key, legacy_shop_id, name, category, description, address,
  postal_code, city_name, phone, email, website, image_url,
  rating, review_count, has_promotion, promotion_text,
  validation_status, publication_status, source, consent_publication, published_at
)
SELECT
  SHA2(CONCAT(
    LOWER(TRIM(COALESCE(s.name, ''))), '|',
    LOWER(TRIM(COALESCE(s.address, ''))), '|',
    LOWER(TRIM(COALESCE(s.postalCode, '')))
  ), 256),
  s.id,
  s.name,
  COALESCE(NULLIF(TRIM(s.category), ''), 'Commerce'),
  s.description,
  COALESCE(NULLIF(TRIM(s.address), ''), COALESCE(NULLIF(TRIM(s.city), ''), 'Adresse non renseignée')),
  COALESCE(NULLIF(TRIM(s.postalCode), ''), '0000'),
  COALESCE(NULLIF(TRIM(s.city), ''), 'Ville non renseignée'),
  s.phone,
  s.email,
  s.website,
  s.imageUrl,
  COALESCE(s.rating, 0),
  COALESCE(s.reviewCount, 0),
  COALESCE(s.hasPromotion, 0),
  s.promotionText,
  'approved',
  'published',
  'legacy',
  1,
  CURRENT_TIMESTAMP
FROM shops s
WHERE s.isActive = 1
ON DUPLICATE KEY UPDATE
  legacy_shop_id = COALESCE(commerce_catalog.legacy_shop_id, VALUES(legacy_shop_id)),
  updated_at = CURRENT_TIMESTAMP;
