// Run all SQL migrations in order — idempotent (CREATE TABLE IF NOT EXISTS, etc.)
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set — skipping migrations');
    process.exit(0);
  }

  const conn = await mysql.createConnection(dbUrl);
  const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found — skipping');
    await conn.end();
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.includes('ROLLBACK'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      // Split by semicolons and execute each statement
      const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
      for (const stmt of statements) {
        if (stmt.trim()) {
          await conn.execute(stmt);
        }
      }
      console.log(`  ✓ ${file}`);
    } catch (err) {
      // Ignore "table already exists" errors
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_ENTRY' || err.errno === 1050 || err.errno === 1062) {
        console.log(`  ⊙ ${file} (already applied)`);
      } else {
        console.error(`  ✗ ${file}: ${err.message}`);
        // Don't fail on migration errors — let the server start anyway
      }
    }
  }

  console.log('Migrations complete');
  await conn.end();
}

main().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(0); // Don't block deployment on migration errors
});
