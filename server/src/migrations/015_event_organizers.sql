-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 015 : organisateurs d'événements (ASBL, commune, commerces)
-- MySQL 8+, idempotente. Un organisateur est rattaché à UN compte utilisateur réel.
-- Un organisateur « trusted » publie sans modération ; les autres restent en attente.

CREATE TABLE IF NOT EXISTS event_organizers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  organizer_type ENUM('asbl', 'commune', 'commerce', 'autre') NOT NULL DEFAULT 'asbl',
  postal_code VARCHAR(12) NOT NULL,
  trusted TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_organizer_user (user_id),
  KEY idx_event_organizer_city (postal_code, is_active, trusted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
