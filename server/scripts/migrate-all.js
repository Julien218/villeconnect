const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('DB connected, running migrations...');
    
    // commerce_catalog missing columns
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
      try { await conn.query(sql); } catch(e) { if(e.errno!==1060) console.log('skip:', e.message.substring(0,80)); }
    }
    console.log('ALTER TABLE done');
    await conn.end();
  } catch(e) {
    console.error('Migration skip:', e.message);
  }
})();
