-- © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
-- VilleConnect OS — Migration 019 : cloisonnement des administrateurs communaux
-- MySQL 8+, idempotente. Un compte `city_admin` ne modère plus que les codes postaux listés ici.
-- À appliquer (après sauvegarde) AVANT de déployer l'API qui l'utilise.

CREATE TABLE IF NOT EXISTS admin_city_scopes (
  user_id INT NOT NULL,
  postal_code VARCHAR(12) NOT NULL,
  granted_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, postal_code),
  KEY idx_city_scope_postal (postal_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reprise de l'existant : chaque city_admin garde l'accès à la commune de son profil, et à elle seule.
INSERT IGNORE INTO admin_city_scopes (user_id, postal_code)
SELECT id, TRIM(postalCode) FROM users
WHERE role = 'city_admin' AND postalCode IS NOT NULL AND TRIM(postalCode) <> '';
