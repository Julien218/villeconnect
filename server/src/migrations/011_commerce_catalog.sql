-- Catalogue commerces canonique partagé par landing, back-office et application.
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

-- Add foreign keys if users table exists (idempotent approach)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_commerce_submitted_by'
);
SET @statement = IF(@fk_exists = 0,
  'ALTER TABLE commerce_catalog ADD CONSTRAINT fk_commerce_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists_2 = (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_commerce_validated_by'
);
SET @statement_2 = IF(@fk_exists_2 = 0,
  'ALTER TABLE commerce_catalog ADD CONSTRAINT fk_commerce_validated_by FOREIGN KEY (validated_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt2 FROM @statement_2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Reprise idempotente des commerces historiques. Leur publication reste soumise
-- à validation : aucune donnée ancienne n'est rendue publique automatiquement.
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

