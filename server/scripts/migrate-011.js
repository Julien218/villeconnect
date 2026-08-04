// © 2026 Js-Innov.IA — Migration runner for staging (commerce_catalog)
const fs = require("fs");
const mysql = require("mysql2/promise");

(async () => {
  console.log("[MIGRATE] Starting migration 011 (commerce_catalog) on staging...");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[MIGRATE] ERROR: DATABASE_URL not set");
    process.exit(1);
  }
  console.log("[MIGRATE] DATABASE_URL: present");

  let connection;
  try {
    connection = await mysql.createConnection({ uri: dbUrl });
    console.log("[MIGRATE] Connected to database");

    // 1. Pre-migration: list existing tables
    const [tables] = await connection.execute("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log("[MIGRATE] Pre-migration tables (" + tableNames.length + "):", tableNames.join(", "));

    // 2. Inspect users.id type and shops structure
    const [usersCols] = await connection.execute("DESCRIBE users");
    const usersIdCol = usersCols.find(c => c.Field === "id");
    console.log("[MIGRATE] users.id type: " + usersIdCol.Type);
    
    if (!usersCols.find(c => c.Field === "id")) {
      console.error("[MIGRATE] ERROR: users table missing id column");
      process.exit(1);
    }

    let hasShops = false;
    let shopsRowCount = 0;
    if (tableNames.includes("shops")) {
      hasShops = true;
      const [shopsCols] = await connection.execute("DESCRIBE shops");
      console.log("[MIGRATE] shops columns:", shopsCols.map(r => r.Field + "(" + r.Type + ")").join(", "));
      
      const [shopsRows] = await connection.execute("SELECT COUNT(*) as cnt FROM shops");
      shopsRowCount = shopsRows[0].cnt;
      console.log("[MIGRATE] shops row count: " + shopsRowCount);
    } else {
      console.log("[MIGRATE] WARNING: shops table not found (will still proceed, INSERT will affect 0 rows)");
    }

    // 3. Backup: dump schema to /tmp
    let schemaDump = "-- Staging backup before migration 011\\n-- Created: " + new Date().toISOString() + "\\n\\n";
    for (const t of tableNames) {
      const [cols] = await connection.execute("SHOW CREATE TABLE " + t);
      schemaDump += "-- Table: " + t + "\\n" + cols[0]["Create Table"] + ";\\n\\n";
    }
    fs.writeFileSync("/tmp/staging_backup_pre_011.sql", schemaDump);
    const backupSize = fs.statSync("/tmp/staging_backup_pre_011.sql").size;
    console.log("[MIGRATE] Backup: " + backupSize + " bytes, " + tableNames.length + " tables");

    if (backupSize < 100) {
      console.error("[MIGRATE] ERROR: Backup appears empty, aborting");
      process.exit(1);
    }

    // 4. Dump shops data for reference
    if (hasShops && shopsRowCount > 0) {
      const [shopsData] = await connection.execute("SELECT * FROM shops");
      fs.writeFileSync("/tmp/staging_shops_dump_pre_011.json", JSON.stringify(shopsData, null, 2));
      console.log("[MIGRATE] Shops data backup: " + shopsRowCount + " rows");
    }

    // 5. Run migration 011
    const sqlPath = "/app/server/src/migrations/011_commerce_catalog.sql";
    if (!fs.existsSync(sqlPath)) {
      console.error("[MIGRATE] ERROR: Migration file not found at " + sqlPath);
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("[MIGRATE] Migration file loaded: " + sql.length + " chars");
    
    // Execute migration statements
    const statements = sql.split(";").filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      await connection.query(stmt);
    }
    console.log("[MIGRATE] Migration 011 applied successfully (" + statements.length + " statements)");

    // 6. Verify table exists
    const [newTables] = await connection.execute("SHOW TABLES");
    const newTableNames = newTables.map(t => Object.values(t)[0]);
    const hasCatalog = newTableNames.includes("commerce_catalog");
    console.log("[MIGRATE] commerce_catalog created: " + hasCatalog);

    if (!hasCatalog) {
      console.error("[MIGRATE] ERROR: commerce_catalog table not found after migration");
      process.exit(1);
    }

    // 7. Verify columns
    const [catalogCols] = await connection.execute("DESCRIBE commerce_catalog");
    console.log("[MIGRATE] commerce_catalog columns (" + catalogCols.length + "):", catalogCols.map(r => r.Field + "(" + r.Type + ")").join(", "));

    // 8. Verify unique constraint on dedupe_key
    const [catalogIdx] = await connection.execute("SHOW INDEX FROM commerce_catalog");
    const dedupeIdx = catalogIdx.filter(i => i.Column_name === "dedupe_key");
    console.log("[MIGRATE] dedupe_key unique constraint: " + (dedupeIdx.length > 0 && dedupeIdx[0].Non_unique === 0 ? "YES" : "NO"));

    // 9. Verify foreign keys
    const [catalogFks] = await connection.execute("SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME='commerce_catalog' AND REFERENCED_TABLE_NAME IS NOT NULL");
    console.log("[MIGRATE] Foreign keys on commerce_catalog: " + catalogFks.length);
    for (const fk of catalogFks) {
      console.log("[MIGRATE]   " + fk.CONSTRAINT_NAME + ": " + fk.COLUMN_NAME + " -> " + fk.REFERENCED_TABLE_NAME + "(" + fk.REFERENCED_COLUMN_NAME + ")");
    }

    // 10. Count reprise of shops data
    const [catalogRows] = await connection.execute("SELECT COUNT(*) as cnt FROM commerce_catalog");
    const catalogRowCount = catalogRows[0].cnt;
    console.log("[MIGRATE] commerce_catalog rows after reprise: " + catalogRowCount);

    // 11. Verify status defaults
    const [statusCheck] = await connection.execute("SELECT validation_status, publication_status, COUNT(*) as cnt FROM commerce_catalog GROUP BY validation_status, publication_status");
    console.log("[MIGRATE] commerce_catalog status distribution:");
    for (const row of statusCheck) {
      console.log("[MIGRATE]   " + row.validation_status + "/" + row.publication_status + ": " + row.cnt);
    }

    // 12. Verify no duplicates on dedupe_key
    const [dedupCheck] = await connection.execute("SELECT dedupe_key, COUNT(*) as cnt FROM commerce_catalog GROUP BY dedupe_key HAVING cnt > 1");
    if (dedupCheck.length === 0) {
      console.log("[MIGRATE] dedupe_key uniqueness: OK (no duplicates)");
    } else {
      console.error("[MIGRATE] ERROR: Found " + dedupCheck.length + " duplicate dedupe_keys");
      for (const dup of dedupCheck) {
        console.error("[MIGRATE]   " + dup.dedupe_key + ": " + dup.cnt + " times");
      }
      process.exit(1);
    }

    console.log("[MIGRATE] Migration 011 COMPLETE and VERIFIED");
    await connection.end();
  } catch (e) {
    console.error("[MIGRATE] ERROR: " + e.message);
    if (connection) await connection.end();
    process.exit(1);
  }
})();

