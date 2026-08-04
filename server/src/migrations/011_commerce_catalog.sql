-- Catalogue commerces canonique partagé par landing, back-office et application.
-- Premières itérations sans FK pour éviter les incompatibilités.
CREATE TABLE IF NOT EXISTS commerce_catalog (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dedupe_key CHAR(64) NOT NULL,
  name VARCHAR(180) NOT NULL,
  legal_name VARCHAR(180) NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Commerce',
  description TEXT NULL,
  address VARCHAR(255) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  city VARCHAR(128) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(320) NULL,
  website VARCHAR(500) NULL,
  image_url VARCHAR(1000) NULL,
  source ENUM('landing','backoffice','import','legacy') NOT NULL,
  validation_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  publication_status ENUM('draft','published','suspended','archived') NOT NULL DEFAULT 'draft',
  submitted_by_user_id INT NULL,
  validated_by_user_id INT NULL,
  validated_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_commerce_catalog_dedupe (dedupe_key),
  KEY idx_commerce_catalog_public (postal_code, validation_status, publication_status),
  KEY idx_commerce_catalog_review (validation_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reprise idempotente des commerces historiques.
INSERT INTO commerce_catalog (
  dedupe_key, name, category, description, address, postal_code, city,
  phone, email, website, image_url, source, validation_status, publication_status
)
SELECT
  SHA2(CONCAT(LOWER(TRIM(name)), '|', LOWER(TRIM(address)), '|', TRIM(postalCode)), 256),
  name, COALESCE(NULLIF(category, ''), 'Commerce'), description,
  COALESCE(NULLIF(address, ''), city), postalCode, city,
  phone, email, website, imageUrl, 'legacy', 'pending', 'draft'
FROM shops
WHERE name IS NOT NULL AND postalCode IS NOT NULL AND city IS NOT NULL
ON DUPLICATE KEY UPDATE updated_at = updated_at;
