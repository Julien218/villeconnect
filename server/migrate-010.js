// © 2026 Js-Innov.IA — Migration runner for staging
const fs = require("fs");
const mysql = require("mysql2/promise");

(async () => {
  console.log("[MIGRATE] Starting migration 010 on staging...");

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

    // 2. Backup: dump schema to /tmp
    let schemaDump = "-- Staging backup before migration 010\n-- Created: " + new Date().toISOString() + "\n\n";
    for (const t of tableNames) {
      const [cols] = await connection.execute("SHOW CREATE TABLE " + t);
      schemaDump += "-- Table: " + t + "\n" + cols[0]["Create Table"] + ";\n\n";
    }
    fs.writeFileSync("/tmp/staging_backup_pre_010.sql", schemaDump);
    const backupSize = fs.statSync("/tmp/staging_backup_pre_010.sql").size;
    console.log("[MIGRATE] Backup: " + backupSize + " bytes, " + tableNames.length + " tables");

    if (backupSize < 100) {
      console.error("[MIGRATE] ERROR: Backup appears empty, aborting");
      process.exit(1);
    }

    // 3. Run migration
    const sqlPath = "/app/src/migrations/010_reward_redemptions.sql";
    if (!fs.existsSync(sqlPath)) {
      console.error("[MIGRATE] ERROR: Migration file not found at " + sqlPath);
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("[MIGRATE] Migration file loaded: " + sql.length + " chars");
    await connection.query(sql);
    console.log("[MIGRATE] Migration 010 applied successfully");

    // 4. Verify
    const [newTables] = await connection.execute("SHOW TABLES");
    const newTableNames = newTables.map(t => Object.values(t)[0]);
    console.log("[MIGRATE] Post-migration tables (" + newTableNames.length + "):", newTableNames.join(", "));

    const hasMS = newTableNames.includes("merchant_shops");
    const hasRR = newTableNames.includes("reward_redemptions");
    console.log("[MIGRATE] merchant_shops created: " + hasMS);
    console.log("[MIGRATE] reward_redemptions created: " + hasRR);

    if (!hasMS || !hasRR) {
      console.error("[MIGRATE] ERROR: Expected tables not found after migration");
      process.exit(1);
    }

    // 5. Verify columns
    const [msCols] = await connection.execute("DESCRIBE merchant_shops");
    console.log("[MIGRATE] merchant_shops columns:", msCols.map(r => r.Field + "(" + r.Type + ")").join(", "));

    const [rrCols] = await connection.execute("DESCRIBE reward_redemptions");
    console.log("[MIGRATE] reward_redemptions columns:", rrCols.map(r => r.Field + "(" + r.Type + ")").join(", "));

    // 6. Verify indexes
    const [msIdx] = await connection.execute("SHOW INDEX FROM merchant_shops");
    console.log("[MIGRATE] merchant_shops indexes: " + msIdx.length);

    const [rrIdx] = await connection.execute("SHOW INDEX FROM reward_redemptions");
    console.log("[MIGRATE] reward_redemptions indexes: " + rrIdx.length);

    // 7. Verify unique constraints
    const [rrUni] = await connection.execute("SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_NAME = reward_redemptions AND NON_UNIQUE = 0");
    console.log("[MIGRATE] reward_redemptions unique keys:", rrUni.map(r => r.INDEX_NAME + "(" + r.COLUMN_NAME + ")").join(", "));

    console.log("[MIGRATE] Migration 010 COMPLETE");
    await connection.end();
  } catch (e) {
    console.error("[MIGRATE] ERROR: " + e.message);
    if (connection) await connection.end();
    process.exit(1);
  }
})();

