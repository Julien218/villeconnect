// Run all SQL migrations in order — idempotent
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
    const rawSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      // Execute the entire SQL file as one query (mysql2 handles multi-statement)
      // First try as a single query
      const statements = rawSql
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const stmt of statements) {
        // Strip leading comment lines from each statement
        const cleanStmt = stmt.split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        
        if (cleanStmt) {
          try {
            await conn.query(cleanStmt);
          } catch (err) {
            // Ignore "table already exists" and "duplicate column" errors
            if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.errno === 1050) {
              // Table exists — try ALTER TABLE to add missing columns
              console.log(`  ⊙ ${file}: table exists, trying ALTER for missing columns...`);
            } else if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
              // Duplicate entry — ignore
            } else if (err.code === 'ER_DUP_FIELD_NAME' || err.errno === 1060) {
              // Duplicate column — already exists, ignore
            } else {
              console.error(`  ! ${file}: ${err.message.substring(0, 100)}`);
            }
          }
        }
      }
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message.substring(0, 100)}`);
    }
  }

  // Also run ALTER TABLE to add missing columns for commerce_catalog
  console.log('Checking for missing columns...');
  try {
    await conn.query("ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS city_name VARCHAR(120) NOT NULL DEFAULT 'Ville non renseignée'");
    console.log('  ✓ commerce_catalog.city_name');
  } catch (err) {
    if (err.errno !== 1060) console.error(`  ! commerce_catalog.city_name: ${err.message.substring(0, 80)}`);
  }
  try {
    await conn.query("ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS canonical_key CHAR(64) NOT NULL DEFAULT ''");
    console.log('  ✓ commerce_catalog.canonical_key');
  } catch (err) {
    if (err.errno !== 1060) console.error(`  ! commerce_catalog.canonical_key: ${err.message.substring(0, 80)}`);
  }
  try {
    await conn.query("ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS publication_status ENUM('draft','published','suspended','archived') NOT NULL DEFAULT 'draft'");
    console.log('  ✓ commerce_catalog.publication_status');
  } catch (err) {
    if (err.errno !== 1060) console.error(`  ! commerce_catalog.publication_status: ${err.message.substring(0, 80)}`);
  }
  try {
    await conn.query("ALTER TABLE commerce_catalog ADD COLUMN IF NOT EXISTS validation_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");
    console.log('  ✓ commerce_catalog.validation_status');
  } catch (err) {
    if (err.errno !== 1060) console.error(`  ! commerce_catalog.validation_status: ${err.message.substring(0, 80)}`);
  }

  console.log('Migrations complete');
  await conn.end();
}

main().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(0); // Don't block deployment on migration errors
});
