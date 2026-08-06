-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 013 : demandes RGPD traçables

CREATE TABLE IF NOT EXISTS privacy_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  request_type ENUM('export', 'erasure') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_for DATETIME NULL,
  processed_at DATETIME NULL,
  processed_by_user_id INT NULL,
  processing_note VARCHAR(500) NULL,
  created_ip_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_privacy_user_status (user_id, request_type, status),
  KEY idx_privacy_schedule (request_type, status, scheduled_for),
  KEY idx_privacy_processed_by (processed_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
