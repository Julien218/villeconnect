-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 007 : Système communes non connectées
-- À exécuter sur Railway MySQL avant déploiement.

-- ────────────────────────────────────────────────────────────
-- 1. TABLE CITIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  postal_code     VARCHAR(10) NOT NULL,
  name            VARCHAR(128) NOT NULL,
  region          ENUM('wallonie','bruxelles','flandre','autre') NOT NULL DEFAULT 'autre',
  country         VARCHAR(8) NOT NULL DEFAULT 'BE',
  status          ENUM(
    'unknown',
    'pending_validation',
    'public_links_available',
    'contacted',
    'interested',
    'verified',
    'rejected'
  ) NOT NULL DEFAULT 'pending_validation',
  official_email  VARCHAR(320) NULL COMMENT 'Email commune — jamais citoyen',
  opt_out_at      DATETIME NULL COMMENT 'Commune a demandé retrait',
  citizen_count   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Count agrégé, non nominatif',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_postal_code (postal_code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 2. TABLE CITY_SERVICE_LINKS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_service_links (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id             INT UNSIGNED NOT NULL,
  service_type        ENUM(
    'website','eguichet','news','agenda','procedures',
    'waste','works','urban','cpas','contact',
    'associations','commerce','other'
  ) NOT NULL,
  label               VARCHAR(128) NOT NULL,
  url                 VARCHAR(512) NOT NULL,
  verified_by_commune TINYINT(1) NOT NULL DEFAULT 0,
  verification_status ENUM('pending_verification','verified','rejected') NOT NULL DEFAULT 'pending_verification',
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  added_by            ENUM('admin','commune','auto') NOT NULL DEFAULT 'admin',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_city_active (city_id, is_active),
  CONSTRAINT fk_csl_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 3. TABLE CITY_REQUESTS
-- Aucune PII — hash uniquement
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_requests (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id       INT UNSIGNED NOT NULL,
  user_id_hash  VARCHAR(64) NOT NULL COMMENT 'SHA-256(user_id + sel), jamais user_id direct',
  request_type  ENUM('first_signup','invite_request','citizen_demand') NOT NULL DEFAULT 'first_signup',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_city_user (city_id, user_id_hash),
  INDEX idx_city_type (city_id, request_type),
  CONSTRAINT fk_cr_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 4. TABLE CITY_CONTACT_ATTEMPTS
-- Journal anti-spam et audit
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_contact_attempts (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id        INT UNSIGNED NOT NULL,
  attempt_type   ENUM('automated','manual') NOT NULL DEFAULT 'automated',
  email_to       VARCHAR(320) NULL COMMENT 'Email commune uniquement',
  status         ENUM('queued','sent','bounced','responded') NOT NULL DEFAULT 'queued',
  template_used  VARCHAR(64) NOT NULL DEFAULT 'commune_invitation_v1',
  citizen_count  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Count au moment de l envoi',
  notes          TEXT NULL,
  sent_at        DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city_status (city_id, status),
  INDEX idx_sent_at (sent_at),
  CONSTRAINT fk_cca_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 5. TABLE CITY_VALIDATION_TOKENS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS city_validation_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  city_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(128) NOT NULL,
  type       ENUM('validate_links','request_activation','request_removal') NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token (token),
  INDEX idx_city_type (city_id, type),
  CONSTRAINT fk_cvt_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
