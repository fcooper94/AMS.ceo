/**
 * Sync missing data from local DB to Railway DB.
 * Only INSERTs rows that exist locally but not on Railway.
 * Never deletes or updates existing Railway data.
 * Uses batch inserts for speed over network.
 */
require('dotenv').config();
const { Client } = require('pg');

// Connection strings come from .env (never hard-code credentials here).
//   LOCAL_DATABASE_URL   — source local Postgres
//   RAILWAY_DATABASE_URL — target Railway Postgres
const LOCAL_URL = process.env.LOCAL_DATABASE_URL;
const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL;

if (!LOCAL_URL || !RAILWAY_URL) {
  console.error('Missing LOCAL_DATABASE_URL and/or RAILWAY_DATABASE_URL in .env');
  process.exit(1);
}

const BATCH_SIZE = 100;

// Tables in dependency order (parents first)
const TABLES = [
  'users',
  'metro_zones',
  'aircraft',
  'airports',
  'system_settings',
  'worlds',
  'airport_zone_mappings',
  'world_memberships',
  'user_aircraft',
  'pricing_defaults',
  'weekly_financials',
  'loans',
  'notifications',
  'airspace_restrictions',
  'airport_route_demands',
  'used_aircraft_for_sale',
  'routes',
  'scheduled_flights',
  'recurring_maintenance',
  'flights',
];

function buildBatchInsert(table, columns, rows) {
  const colNames = columns.map(c => `"${c}"`).join(', ');
  const valueClauses = [];
  const params = [];
  let paramIdx = 1;

  for (const row of rows) {
    const placeholders = columns.map(() => `$${paramIdx++}`).join(', ');
    valueClauses.push(`(${placeholders})`);
    for (const c of columns) {
      params.push(row[c]);
    }
  }

  const sql = `INSERT INTO "${table}" (${colNames}) VALUES ${valueClauses.join(', ')} ON CONFLICT ("id") DO NOTHING`;
  return { sql, params };
}

async function main() {
  const local = new Client({ connectionString: LOCAL_URL });
  const railway = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });

  await local.connect();
  console.log('Connected to LOCAL');
  await railway.connect();
  console.log('Connected to RAILWAY\n');

  let totalInserted = 0;

  for (const name of TABLES) {
    // Check table exists on both sides
    const localExists = await local.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [name]
    );
    const railwayExists = await railway.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [name]
    );
    if (localExists.rowCount === 0 || railwayExists.rowCount === 0) {
      console.log(`  SKIP ${name} (table missing on one side)`);
      continue;
    }

    // Get all local rows
    const localRows = await local.query(`SELECT * FROM "${name}"`);
    if (localRows.rowCount === 0) {
      console.log(`  ${name}: 0 local rows`);
      continue;
    }

    // Get existing PKs on Railway
    const railwayPks = await railway.query(`SELECT "id" FROM "${name}"`);
    const existingIds = new Set(railwayPks.rows.map(r => String(r.id)));

    // Find missing rows
    const missing = localRows.rows.filter(r => !existingIds.has(String(r.id)));

    if (missing.length === 0) {
      console.log(`  ${name}: ${localRows.rowCount} rows, all present on Railway`);
      continue;
    }

    // Batch insert missing rows
    const columns = Object.keys(missing[0]);
    let inserted = 0;

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      try {
        const { sql, params } = buildBatchInsert(name, columns, batch);
        const result = await railway.query(sql, params);
        inserted += result.rowCount;
      } catch (err) {
        console.error(`    ERROR batch insert into ${name} (batch ${Math.floor(i/BATCH_SIZE)+1}): ${err.message}`);
        // Fall back to row-by-row for this batch to skip bad rows
        for (const row of batch) {
          const values = columns.map(c => row[c]);
          const placeholders = columns.map((_, j) => `$${j + 1}`).join(', ');
          const colNames = columns.map(c => `"${c}"`).join(', ');
          try {
            await railway.query(
              `INSERT INTO "${name}" (${colNames}) VALUES (${placeholders}) ON CONFLICT ("id") DO NOTHING`,
              values
            );
            inserted++;
          } catch (rowErr) {
            // skip this row
          }
        }
      }
    }

    console.log(`  ${name}: +${inserted} new rows (of ${localRows.rowCount} local, ${missing.length} missing)`);
    totalInserted += inserted;
  }

  console.log(`\nDone. Total rows added to Railway: ${totalInserted}`);

  await local.end();
  await railway.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
