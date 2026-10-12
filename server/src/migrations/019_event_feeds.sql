-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- Flux d'événements importés automatiquement (iCal / .ics) depuis une source autorisée
-- (commune, ASBL). À appliquer manuellement, après sauvegarde de la base.
-- Les événements importés restent « pending » (validation) sauf si le flux est marqué auto_approve.

CREATE TABLE IF NOT EXISTS event_feeds (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  postal_code VARCHAR(12) NOT NULL DEFAULT '7370',
  feed_url VARCHAR(512) NOT NULL,
  default_category VARCHAR(60) NOT NULL DEFAULT 'Autre',
  organizer VARCHAR(160) NULL,
  auto_approve TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_fetched_at DATETIME NULL,
  last_status ENUM('ok', 'error') NULL,
  last_message VARCHAR(255) NULL,
  last_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_feeds_url (feed_url(255)),
  KEY idx_event_feeds_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rattache un événement à son flux d'origine (évite les doublons à chaque synchronisation).
ALTER TABLE events
  ADD COLUMN source_feed_id INT NULL,
  ADD COLUMN source_uid VARCHAR(190) NULL,
  ADD UNIQUE KEY uq_events_source (source_feed_id, source_uid);
