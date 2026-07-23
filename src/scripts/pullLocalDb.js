#!/usr/bin/env node
/**
 * db:pull — Refresh the local DB from Railway.
 *
 * DEFAULT: reference data only (airports, aircraft types, users, settings…)
 * — NO production worlds/airlines/fleets. The local test environment is the
 * seeded Dev worlds (`npm run db:seed-dev`), which you must re-run after a
 * pull since the DB is dropped and recreated.
 *
 * `npm run db:pull -- --with-worlds` additionally copies the production
 * worlds and their data (EGLL demand rows, 2023+ financials), then pauses
 * them locally so the sim doesn't tick full-size prod copies.
 *
 * Credentials come from .env (never hard-code them here):
 *   RAILWAY_DATABASE_URL — source Railway Postgres
 *   LOCAL_DATABASE_URL   — target local Postgres (dropped & recreated)
 * Optional path overrides: PSQL_PATH, PGDUMP_PATH
 *
 * Windows-safe: passwords are passed via a temporary PGPASSFILE (covers both
 * ends of the dump|restore pipe), not `PGPASSWORD=x cmd` inline prefixes,
 * which are Unix-shell syntax and break under cmd.exe.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RAILWAY = process.env.RAILWAY_DATABASE_URL;
const LOCAL   = process.env.LOCAL_DATABASE_URL;

if (!RAILWAY || !LOCAL) {
  console.error('Missing RAILWAY_DATABASE_URL and/or LOCAL_DATABASE_URL in .env');
  process.exit(1);
}

// Auto-detect the installed PostgreSQL version's bin dir (17, 18, ...)
function detectPgBin(tool) {
  const base = 'C:/Program Files/PostgreSQL';
  if (fs.existsSync(base)) {
    const versions = fs.readdirSync(base).filter(v => /^\d+$/.test(v)).sort((a, b) => b - a);
    for (const v of versions) {
      const p = `${base}/${v}/bin/${tool}.exe`;
      if (fs.existsSync(p)) return `"${p}"`;
    }
  }
  return tool; // hope it's on PATH (e.g. Linux/Mac)
}
const PSQL   = process.env.PSQL_PATH   || detectPgBin('psql');
const PGDUMP = process.env.PGDUMP_PATH || detectPgBin('pg_dump');

function urlArgs(url) {
  const u = new URL(url);
  return `-h ${u.hostname} -p ${u.port || '5432'} -U ${u.username} -d ${u.pathname.slice(1)}`;
}

const R = new URL(RAILWAY);
const L = new URL(LOCAL);
const LOCAL_DB = L.pathname.slice(1);

// Temporary pgpass file with BOTH endpoints — pg tools pick the matching line
// per connection, so a single dump|restore pipe can auth to Railway and local
// at the same time.
const pgpassPath = path.join(os.tmpdir(), `ams-pgpass-${process.pid}.conf`);
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/:/g, '\\:');
fs.writeFileSync(pgpassPath, [
  `${R.hostname}:${R.port || '5432'}:*:${R.username}:${esc(decodeURIComponent(R.password))}`,
  `${L.hostname}:${L.port || '5432'}:*:${L.username}:${esc(decodeURIComponent(L.password))}`,
  ''
].join('\n'));

// psql pointed at the local target DB / maintenance DB
const localPsql  = `${PSQL} -h ${L.hostname} -p ${L.port || '5432'} -U ${L.username} -d ${LOCAL_DB}`;
const localAdmin = `${PSQL} -h ${L.hostname} -p ${L.port || '5432'} -U ${L.username} -d postgres`;

const ENV = { ...process.env, PGPASSFILE: pgpassPath };

function run(cmd) {
  console.log(`  → ${cmd.slice(0, 100)}...`);
  execSync(cmd, { stdio: 'inherit', shell: true, env: ENV });
}

function cleanup() {
  try { fs.unlinkSync(pgpassPath); } catch (_) {}
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

const WITH_WORLDS = process.argv.includes('--with-worlds');

// World/simulation tables excluded in reference-only mode — local testing
// uses the seeded Dev worlds, not copies of production.
const WORLD_TABLES = [
  'worlds', 'world_memberships', 'user_aircraft', 'routes', 'scheduled_flights',
  'recurring_maintenance', 'loans', 'notifications', 'marketing_campaigns',
  'sightseeing_tours', 'used_aircraft_for_sale', 'pricing_defaults', 'payments'
];

console.log('');
console.log(`  AMS — db:pull (Railway → Local, ${WITH_WORLDS ? 'WITH production worlds' : 'reference data only'})`);
console.log('  ─────────────────────────────────');
console.log('');

try {
  // 1. Drop & recreate local DB
  console.log(`  [1/4] Recreating local database "${LOCAL_DB}"...`);
  run(`${localAdmin} -c "DROP DATABASE IF EXISTS ${LOCAL_DB};"`);
  run(`${localAdmin} -c "CREATE DATABASE ${LOCAL_DB};"`);

  // 2. Dump schema + data (large tables always excluded; world tables excluded
  //    unless --with-worlds)
  console.log('  [2/4] Dumping schema and reference tables from Railway...');
  const excludes = ['airport_route_demands', 'weekly_financials']
    .concat(WITH_WORLDS ? [] : WORLD_TABLES)
    .map(t => `--exclude-table-data=${t}`)
    .join(' ');
  run(
    `${PGDUMP} ${urlArgs(RAILWAY)} --no-owner --no-privileges ${excludes} ` +
    `| ${localPsql} -q`
  );

  // Verify the dump actually landed — under cmd.exe a pipeline's exit code is
  // the LAST command's, so a pg_dump failure (e.g. server version mismatch)
  // would otherwise pass silently with an empty database.
  const check = execSync(
    `${PSQL} -h ${L.hostname} -p ${L.port || '5432'} -U ${L.username} -d ${LOCAL_DB} -t -A -c "SELECT COUNT(*) FROM airports"`,
    { shell: true, env: ENV }
  ).toString().trim();
  if (!parseInt(check)) throw new Error('Dump/restore produced an empty database (check pg_dump output above — version mismatch?)');

  if (WITH_WORLDS) {
    // 3. Stream EGLL demand rows
    console.log('  [3/4] Copying EGLL demand data...');
    run(
      `${PSQL} ${urlArgs(RAILWAY)} ` +
      `-c "\\copy (SELECT * FROM airport_route_demands WHERE from_airport_id = (SELECT id FROM airports WHERE icao_code = 'EGLL') OR to_airport_id = (SELECT id FROM airports WHERE icao_code = 'EGLL')) TO STDOUT" ` +
      `| ${localPsql} -c "\\copy airport_route_demands FROM STDIN"`
    );

    // 4. Stream recent financials (2023+) and pause the copied prod worlds so
    //    the local sim doesn't tick full-size copies of them.
    console.log('  [4/4] Copying financials (2023+) and pausing prod worlds...');
    run(
      `${PSQL} ${urlArgs(RAILWAY)} ` +
      `-c "\\copy (SELECT * FROM weekly_financials WHERE week_start >= '2023-01-01') TO STDOUT" ` +
      `| ${localPsql} -c "\\copy weekly_financials FROM STDIN"`
    );
    run(`${localPsql} -c "UPDATE worlds SET is_paused = true WHERE name NOT LIKE 'Dev %';"`);
  } else {
    console.log('  [3/4] Skipping demand rows (served from the gz cache at runtime)');
    console.log('  [4/4] Skipping production world data (reference-only mode)');
  }

  console.log('');
  console.log(`  Done. Local DB is up to date (${WITH_WORLDS ? 'prod-world copies paused' : 'reference data only'}).`);
  console.log('  Now seed the test worlds: npm run db:seed-dev -- --fresh');
  console.log('');
} catch (err) {
  console.error('\n  ✗ db:pull failed:', err.message);
  process.exit(1);
}
