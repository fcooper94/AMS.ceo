#!/usr/bin/env node
/**
 * db:pull — Refresh local airline_control DB from Railway.
 * Keeps demand data for EGLL only, financials from 2023 onwards.
 * Run this when on good WiFi before going offline.
 */

const { execSync } = require('child_process');

const RAILWAY = 'postgresql://postgres:jDRZMptMpBRUAxwWIpMKrhJixYnTJbyU@nozomi.proxy.rlwy.net:22768/railway';
const LOCAL   = 'postgresql://postgres:Chieftain1994@localhost:5432/airline_control';

const PSQL   = '"C:/Program Files/PostgreSQL/18/bin/psql"';
const PGDUMP = '"C:/Program Files/PostgreSQL/18/bin/pg_dump"';

function run(cmd) {
  console.log(`  → ${cmd.slice(0, 80)}...`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function psql(url, sql) {
  return `PGPASSWORD=${urlPassword(url)} ${PSQL} ${urlArgs(url)} -c "${sql}"`;
}

function urlPassword(url) { return new URL(url).password; }
function urlArgs(url) {
  const u = new URL(url);
  return `-h ${u.hostname} -p ${u.port} -U ${u.username} -d ${u.pathname.slice(1)}`;
}

console.log('');
console.log('  AMS — db:pull (Railway → Local)');
console.log('  ─────────────────────────────────');
console.log('');

// 1. Drop & recreate local DB
console.log('  [1/4] Recreating local database...');
execSync(`PGPASSWORD=Chieftain1994 ${PSQL} -h localhost -U postgres -c "DROP DATABASE IF EXISTS airline_control;"`, { stdio: 'inherit', shell: true });
execSync(`PGPASSWORD=Chieftain1994 ${PSQL} -h localhost -U postgres -c "CREATE DATABASE airline_control;"`, { stdio: 'inherit', shell: true });

// 2. Dump schema + all data except large tables
console.log('  [2/4] Dumping schema and small tables from Railway...');
run(
  `PGPASSWORD=${urlPassword(RAILWAY)} ${PGDUMP} ${urlArgs(RAILWAY).replace('-d railway', '')} -d railway ` +
  `--exclude-table-data=airport_route_demands --exclude-table-data=weekly_financials ` +
  `| PGPASSWORD=Chieftain1994 ${PSQL} -h localhost -U postgres -d airline_control`
);

// 3. Stream EGLL demand rows
console.log('  [3/4] Copying EGLL demand data...');
run(
  `PGPASSWORD=${urlPassword(RAILWAY)} ${PSQL} ${urlArgs(RAILWAY)} ` +
  `-c "\\copy (SELECT * FROM airport_route_demands WHERE from_airport_id = (SELECT id FROM airports WHERE icao_code = 'EGLL') OR to_airport_id = (SELECT id FROM airports WHERE icao_code = 'EGLL')) TO STDOUT" ` +
  `| PGPASSWORD=Chieftain1994 ${PSQL} -h localhost -U postgres -d airline_control ` +
  `-c "\\copy airport_route_demands FROM STDIN"`
);

// 4. Stream recent financials (2023+)
console.log('  [4/4] Copying financials (2023+)...');
run(
  `PGPASSWORD=${urlPassword(RAILWAY)} ${PSQL} ${urlArgs(RAILWAY)} ` +
  `-c "\\copy (SELECT * FROM weekly_financials WHERE week_start >= '2023-01-01') TO STDOUT" ` +
  `| PGPASSWORD=Chieftain1994 ${PSQL} -h localhost -U postgres -d airline_control ` +
  `-c "\\copy weekly_financials FROM STDIN"`
);

console.log('');
console.log('  Done. Local DB is up to date.');
console.log('');
