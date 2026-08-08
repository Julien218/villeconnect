// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

export const db = pool;

// Auto-migration non bloquante au startup
(async () => {
  try {
    // CREATE TABLE IF NOT EXISTS (MySQL 8.0 compatible)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commerce_catalog (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        canonical_key CHAR(64) NOT NULL DEFAULT '',
        legacy_shop_id INT NULL,
        city_id INT NULL,
        name VARCHAR(190) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Commerce',
        description TEXT NULL,
        address VARCHAR(255) NOT NULL,
        postal_code VARCHAR(12) NOT NULL,
        city_name VARCHAR(120) NOT NULL DEFAULT 'Ville non renseignée',
        phone VARCHAR(40) NULL,
        email VARCHAR(190) NULL,
        website VARCHAR(500) NULL,
        image_url VARCHAR(1000) NULL,
        rating DECIMAL(3,2) NOT NULL DEFAULT 0,
        review_count INT UNSIGNED NOT NULL DEFAULT 0,
        has_promotion TINYINT(1) NOT NULL DEFAULT 0,
        promotion_text VARCHAR(255) NULL,
        validation_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        publication_status ENUM('draft','published','suspended','archived') NOT NULL DEFAULT 'draft',
        source ENUM('landing','backoffice','import','legacy') NOT NULL DEFAULT 'landing',
        consent_publication TINYINT(1) NOT NULL DEFAULT 0,
        submitted_by_user_id INT NULL,
        reviewed_by_user_id INT NULL,
        reviewed_at DATETIME NULL,
        published_at DATETIME NULL,
        rejection_reason VARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_commerce_canonical_key (canonical_key),
        KEY idx_commerce_public (postal_code, validation_status, publication_status, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ commerce_catalog table ready');

    // ALTER TABLE — TOUTES les colonnes (MySQL 8.0 sans IF NOT EXISTS, catch errno 1060)
    const columns = [
      ["canonical_key", "CHAR(64) NOT NULL DEFAULT ''"],
      ["legacy_shop_id", "INT NULL"],
      ["city_id", "INT NULL"],
      ["city_name", "VARCHAR(120) NOT NULL DEFAULT 'Ville non renseignée'"],
      ["rating", "DECIMAL(3,2) NOT NULL DEFAULT 0"],
      ["review_count", "INT UNSIGNED NOT NULL DEFAULT 0"],
      ["has_promotion", "TINYINT(1) NOT NULL DEFAULT 0"],
      ["promotion_text", "VARCHAR(255) NULL"],
      ["validation_status", "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'"],
      ["publication_status", "ENUM('draft','published','suspended','archived') NOT NULL DEFAULT 'draft'"],
      ["source", "ENUM('landing','backoffice','import','legacy') NOT NULL DEFAULT 'landing'"],
      ["consent_publication", "TINYINT(1) NOT NULL DEFAULT 0"],
      ["submitted_by_user_id", "INT NULL"],
      ["reviewed_by_user_id", "INT NULL"],
      ["reviewed_at", "DATETIME NULL"],
      ["published_at", "DATETIME NULL"],
      ["rejection_reason", "VARCHAR(500) NULL"],
    ];

    for (const [col, def] of columns) {
      try {
        await pool.query(`ALTER TABLE commerce_catalog ADD COLUMN ${col} ${def}`);
      } catch (e: any) {
        // errno 1060 = Duplicate column name (déjà existante) — normal
        if (e?.errno !== 1060) {
          console.error(`  ALTER ${col}: ${e?.message?.substring(0, 80)}`);
        }
      }
    }
    console.log('✅ Auto-migration commerce_catalog terminée');
  } catch (e: any) {
    console.error('⚠️ Auto-migration skip:', e?.message?.substring(0, 120));
  }
})();
