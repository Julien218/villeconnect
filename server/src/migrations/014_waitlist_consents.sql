-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 014 : preuve de consentement liste d'attente

CREATE TABLE IF NOT EXISTS waitlist_consents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  waitlist_id INT NOT NULL,
  policy_version VARCHAR(40) NOT NULL,
  consented_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(64) NOT NULL DEFAULT 'landing',
  ip_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_waitlist_consent_version (waitlist_id, policy_version),
  KEY idx_waitlist_consent_date (consented_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
