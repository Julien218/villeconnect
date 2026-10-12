-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 018 : rubrique Sport (clubs et installations sportives)
-- MySQL 8+, idempotente. Aucune fiche n'est insérée ici : les clubs proposent leur fiche depuis
-- l'application (statut « pending »), un administrateur de ville la publie en un clic.

CREATE TABLE IF NOT EXISTS sport_places (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  postal_code VARCHAR(12) NOT NULL,
  kind ENUM('club', 'installation') NOT NULL,
  name VARCHAR(160) NOT NULL,
  -- Disciplines séparées par des virgules (ex. « Football,Futsal »).
  sports VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  address VARCHAR(255) NULL,
  audience VARCHAR(120) NULL,
  schedule VARCHAR(255) NULL,
  price_info VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  website VARCHAR(500) NULL,
  status ENUM('pending', 'published', 'rejected', 'archived') NOT NULL DEFAULT 'pending',
  submitted_by_user_id INT NULL,
  reviewed_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sport_public (postal_code, status, kind),
  KEY idx_sport_submitter (submitted_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
