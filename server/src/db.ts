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
    const alters = [
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS city_name VARCHAR(120) NOT NULL DEFAULT 'Ville non renseignée'",
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS canonical_key CHAR(64) NOT NULL DEFAULT ''",
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS publication_status ENUM('draft','published','suspended','archived') NOT NULL DEFAULT 'draft'",
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS validation_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'",
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS city_id INT NULL",
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS source ENUM('landing','backoffice','import','legacy') NOT NULL DEFAULT 'landing'",
      "ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS consent_publication TINYINT(1) NOT NULL DEFAULT 0",
    ];
    for (const sql of alters) {
      try { await pool.query(sql); } catch (e) { /* colonne existe déjà = OK */ }
    }
    console.log('✅ Auto-migration commerce_catalog terminée');
  } catch (e: any) {
    console.error('⚠️ Auto-migration skip:', e?.message?.substring(0, 120));
  }
})();
