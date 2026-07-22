/**
 * Generate src/data/usDomesticReal2024.json from the BTS T-100 Domestic Segment
 * dataset (src/data/t100Domestic2024.csv — 2024 annual, both directions summed
 * per airport pair).
 *
 * Output: one entry per undirected US domestic pair (keyed by ICAO):
 *   { "KJFK_KLAX": { "pax": 7629, "arch": "business" }, ... }
 *   - pax  = 2024 daily passengers, both directions (annual total / 365, min 1)
 *   - arch = history archetype (business | leisure | lifeline | regional)
 *
 * The runtime (usDomesticDemandService) back-projects each through the eras and
 * overrides the gravity model for these pairs. BTS 3-letter codes are resolved
 * to our DB airports by iataCode (falling back to K+code as icaoCode), which
 * handles Alaska (PA*), Hawaii (PH*) and Puerto Rico (TJ*) automatically.
 *
 * Regenerate: node src/scripts/generateUsDomesticData.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const { Airport } = require('../models');
const { Op } = require('sequelize');

// Leisure destinations (IATA) — Florida, Las Vegas, ski/mountain resorts,
// Puerto Rico / Caribbean, beach/holiday markets. Hawaii is handled separately
// (mainland↔Hawaii = leisure; Hawaii↔Hawaii = lifeline).
const LEISURE = new Set([
  // Florida
  'MCO', 'SFB', 'DAB', 'MLB', 'PBI', 'FLL', 'MIA', 'RSW', 'PGD', 'SRQ', 'TPA',
  'PIE', 'JAX', 'GNV', 'TLH', 'PNS', 'VPS', 'ECP', 'EYW', 'APF',
  // Las Vegas
  'LAS',
  // Ski / mountain resorts
  'ASE', 'EGE', 'HDN', 'JAC', 'MTJ', 'GUC', 'SUN', 'GJT', 'COD', 'BZN', 'WYS',
  'FCA', 'DRO', 'RNO',
  // Puerto Rico / US Virgin Islands
  'SJU', 'BQN', 'PSE', 'STT', 'STX',
  // Other beach / holiday markets
  'MYR', 'HHH', 'PSP', 'ACY', 'SAV', 'SBP', 'MTH'
]);

// Major business hubs (IATA). A pair only reads as "business" when BOTH ends are
// hubs (trunk/transcon). Everything else falls to "regional".
const BUSINESS = new Set([
  'ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'LGA', 'EWR', 'SFO', 'SEA', 'BOS',
  'IAH', 'IAD', 'DCA', 'CLT', 'PHX', 'MSP', 'DTW', 'PHL', 'SLC', 'BWI', 'MDW',
  'SAN', 'PDX', 'STL', 'MCI', 'CLE', 'CVG', 'IND', 'CMH', 'PIT', 'MKE', 'BNA',
  'AUS', 'SAT', 'MSY', 'RDU', 'SMF', 'SJC', 'OAK', 'ONT', 'HOU', 'DAL', 'MEM',
  'ABQ', 'BUF', 'PVD', 'ORF', 'RIC', 'GRR', 'OMA'
]);

function archetype(icaoA, icaoB, iataA, iataB) {
  const akA = icaoA.startsWith('PA'), akB = icaoB.startsWith('PA');
  const hiA = icaoA.startsWith('PH'), hiB = icaoB.startsWith('PH');
  if (akA || akB) return 'lifeline';        // any Alaska endpoint — air is the lifeline
  if (hiA && hiB) return 'lifeline';        // Hawaii inter-island commuter
  if (hiA || hiB || LEISURE.has(iataA) || LEISURE.has(iataB)) return 'leisure';
  if (BUSINESS.has(iataA) && BUSINESS.has(iataB)) return 'business';
  return 'regional';
}

async function main() {
  await sequelize.authenticate();
  // US-space airports (CONUS K*, Alaska PA*, Hawaii PH*, Guam/Marianas PG*,
  // Puerto Rico/USVI TJ*, plus a few Pacific). Build iata→icao and icao lookups.
  const us = await Airport.findAll({
    where: { icaoCode: { [Op.regexp]: '^(K|P[AHOMWG]|T[IJ])' } },
    attributes: ['icaoCode', 'iataCode'], raw: true
  });
  const iataToIcao = {}, icaoToIata = {}, icaoSet = new Set();
  for (const a of us) {
    if (a.iataCode) { iataToIcao[a.iataCode] = a.icaoCode; icaoToIata[a.icaoCode] = a.iataCode; }
    icaoSet.add(a.icaoCode);
  }
  const resolve = code => iataToIcao[code] || (icaoSet.has('K' + code) ? 'K' + code : (icaoSet.has(code) ? code : null));

  const csv = fs.readFileSync(path.join(__dirname, '../data/t100Domestic2024.csv'), 'utf8')
    .split(/\r?\n/).filter(Boolean);
  const out = {};
  let kept = 0, droppedUnmapped = 0;
  const unmappedCodes = new Set();

  for (let i = 1; i < csv.length; i++) { // skip header
    const [oIata, dIata, paxStr] = csv[i].split(',');
    const annual = parseInt(paxStr, 10) || 0;
    if (annual <= 0) continue;
    const oIcao = resolve(oIata), dIcao = resolve(dIata);
    if (!oIcao) unmappedCodes.add(oIata);
    if (!dIcao) unmappedCodes.add(dIata);
    if (!oIcao || !dIcao || oIcao === dIcao) { droppedUnmapped++; continue; }

    const daily = Math.max(1, Math.round(annual / 365));
    const [a, b] = oIcao < dIcao ? [oIcao, dIcao] : [dIcao, oIcao];
    const key = `${a}_${b}`;
    const arch = archetype(a, b, icaoToIata[a] || oIata, icaoToIata[b] || dIata);
    if (!out[key] || daily > out[key].pax) out[key] = { pax: daily, arch };
    kept++;
  }

  const outPath = path.join(__dirname, '../data/usDomesticReal2024.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 0));

  const byArch = {};
  for (const k in out) byArch[out[k].arch] = (byArch[out[k].arch] || 0) + 1;
  console.log(`US domestic real routes written: ${Object.keys(out).length} pairs`);
  console.log('By archetype:', byArch);
  console.log(`Rows kept: ${kept}, dropped (unmapped/self): ${droppedUnmapped}, distinct unmapped codes: ${unmappedCodes.size}`);
  console.log('Written to', outPath);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
