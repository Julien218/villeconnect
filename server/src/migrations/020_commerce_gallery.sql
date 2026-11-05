-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 020 : galerie photos de la vitrine d'un commerce
-- MySQL 8+, idempotente. Les photos sont stockées sur Cloudflare R2 (dossier gallery/<commerce>/),
-- seule leur adresse est enregistrée ici. Au plus 8 photos par commerce (contrôlé par l'API).

CREATE TABLE IF NOT EXISTS commerce_photos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  commerce_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(120) NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  added_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commerce_photos (commerce_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
