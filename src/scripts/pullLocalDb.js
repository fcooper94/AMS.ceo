#!/usr/bin/env node
/**
 * db:pull — Refresh the local DB from Railway.
 * Keeps demand data for EGLL only, financials from 2023 onwards.
 * Run this when on good WiFi before going offline.
 *
 * Credentials come from .env (never hard-code them here):
 *   RAILWAY_DATABASE_URL — source Railway Postgres
 *   LOCAL_DATABASE_URL   — target local Postgres (dropped & recreated)
 * Optional path overrides: PSQL_PATH, PGDUMP_PATH
 */

require('dotenv').config();
const { execSync } = require('child_process');

const RAILWAY = process.env.RAILWAY_DATABASE_URL;
const LOCAL   = process.env.LOCAL_DATABASE_URL;

if (!RAILWAY || !LOCAL) {
  console.error('Missing RAILWAY_DATABASE_URL and/or LOCAL_DATABASE_URL in .env');
  process.exit(1);
}

const PSQL   = process.env.PSQL_PATH   || '"C:/Program Files/PostgreSQL/18/bin/psql"';
const PGDUMP = process.env.PGDUMP_PATH || '"C:/Program Files/PostgreSQL/18/bin/pg_dump"';

function urlPassword(url) { return new URL(url).password; }
function urlArgs(url) {
  const u = new URL(url);
  return `-h ${u.hostname} -p ${u.port} -U ${u.username} -d ${u.pathname.slice(1)}`;
}

// Derive local connection params from LOCAL_DATABASE_URL
const L = new URL(LOCAL);
const LOCAL_PW   = L.password;
const LOCAL_HOST = L.hostname;
const LOCAL_PORT = L.port || '5432';
const LOCAL_USER = L.username;
const LOCAL_DB   = L.pathname.slice(1);

// psql pointed at the local target DB
const localPsql  = `PGPASSWORD=${LOCAL_PW} ${PSQL} -h ${LOCAL_HOST} -p ${LOCAL_PORT} -U ${LOCAL_USER} -d ${LOCAL_DB}`;
// psql pointed at the maintenance DB (so we can drop/create the target)
const localAdmin = `PGPASSWORD=${LOCAL_PW} ${PSQL} -h ${LOCAL_HOST} -p ${LOCAL_PORT} -U ${LOCAL_USER} -d postgres`;

function run(cmd) {
  console.log(`  → ${cmd.slice(0, 80)}...`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

console.log('');
console.log('  AMS — db:pull (Railway → Local)');
console.log('  ─────────────────────────────────');
console.log('');

// 1. Drop & recreate local DB
console.log(`  [1/4] Recreating local database "${LOCAL_DB}"...`);
execSync(`${localAdmin} -c "DROP DATABASE IF EXISTS ${LOCAL_DB};"`, { stdio: 'inherit', shell: true });
execSync(`${localAdmin} -c "CREATE DATABASE ${LOCAL_DB};"`, { stdio: 'inherit', shell: true });

// 2. Dump schema + all data except large tables
console.log('  [2/4] Dumping schema and small tables from Railway...');
run(
  `PGPASSWORD=${urlPassword(RAILWAY)} ${PGDUMP} ${urlArgs(RAILWAY)} ` +
  `--exclude-table-data=airport_route_demands --exclude-table-data=weekly_financials ` +
  `| ${localPsql}`
);

// 3. Stream EGLL demand rows
console.log('  [3/4] Copying EGLL demand data...');
run(
  `PGPASSWORD=${urlPassword(RAILWAY)} ${PSQL} ${urlArgs(RAILWAY)} ` +
  `-c "\\copy (SELECT * FROM airport_route_demands WHERE from_airport_id = (SELECT id FROM airports WHERE icao_code = 'EGLL') OR to_airport_id = (SELECT id FROM airports WHERE icao_code = 'EGLL')) TO STDOUT" ` +
  `| ${localPsql} -c "\\copy airport_route_demands FROM STDIN"`
);

// 4. Stream recent financials (2023+)
console.log('  [4/4] Copying financials (2023+)...');
run(
  `PGPASSWORD=${urlPassword(RAILWAY)} ${PSQL} ${urlArgs(RAILWAY)} ` +
  `-c "\\copy (SELECT * FROM weekly_financials WHERE week_start >= '2023-01-01') TO STDOUT" ` +
  `| ${localPsql} -c "\\copy weekly_financials FROM STDIN"`
);

console.log('');
console.log('  Done. Local DB is up to date.');
console.log('');
