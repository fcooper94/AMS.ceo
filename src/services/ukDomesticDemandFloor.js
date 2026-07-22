/**
 * UK Domestic Demand Floor
 *
 * The zone-based gravity model (see generateDemandData.js) is deliberately
 * selective: it only keeps airport pairs scoring above a threshold, and it
 * skips airports that don't fall inside a curated metro zone. That leaves gaps
 * for UK domestic connectivity — e.g. the Channel Islands (Jersey/Guernsey/
 * Alderney, under country "Jersey"/"Guernsey") never entered the model at all,
 * and many small UK↔UK pairs were dropped below the score-7 cutoff. Players saw
 * "no demand" (no_data) for legitimate domestic routes such as EGBB→EGJJ.
 *
 * This module guarantees a NON-ZERO, era- and size-scaled demand for every
 * ordered pair of *commercial civil* UK / Crown-Dependency airports, in every
 * era. It is applied at boot by demandCacheService as `max(gravityDemand,
 * floor)`, so it only ever RAISES a pair to the floor — it never lowers the
 * gravity model's own (usually higher) values on busy routes.
 *
 * Scope decision (confirmed with the user, 2026-07):
 *   - Commercial civil only. Include International Hubs + civil Major airports +
 *     Channel Islands + Scottish island lifeline strips.
 *   - Exclude RAF/RNAS/military bases and BAE Warton (MILITARY set below).
 *   - Exclude mainland GA airfields with no scheduled service (Sywell, Cotswold,
 *     Upavon, Wycombe, Rochester, Goodwood, Perth, Bembridge) — these are
 *     type "Regional" and simply not in REGIONAL_INCLUDE, so they're excluded
 *     automatically.
 *
 * Only UK↔UK (incl. Crown Dependencies) pairs get a floor. International demand
 * to/from these airports still comes from the gravity model as before.
 *
 * To change the airport set or sizes, edit the maps in this one file.
 */

// Countries whose airports count as "UK domestic" for connectivity.
const COUNTRIES = new Set(['United Kingdom', 'Jersey', 'Guernsey', 'Isle of Man']);

// Military / non-civil fields to exclude even though typed Major.
const MILITARY = new Set([
  'EGDY', // RNAS Yeovilton
  'EGQL', // Leuchars Station (Army)
  'EGQS', // RAF Lossiemouth
  'EGUB', // RAF Benson
  'EGUL', // RAF Lakenheath
  'EGUN', // RAF Mildenhall
  'EGVA', // RAF Fairford
  'EGVN', // RAF Brize Norton
  'EGVO', // RAF Odiham
  'EGWU', // RAF Northolt
  'EGXC', // RAF Coningsby
  'EGXH', // RAF Honington
  'EGXW', // RAF Waddington
  'EGYM', // RAF Marham
  'EGNO'  // Warton (BAE Systems test airfield, no scheduled service)
]);

// Type "Regional" airports that DO have scheduled/lifeline service and should be
// included (Scottish islands, Scilly, Land's End). Any Regional field not listed
// here (mainland GA airstrips) is excluded.
const REGIONAL_INCLUDE = new Set([
  'EGEF', // Fair Isle
  'EGEH', // Whalsay
  'EGEI', // Broadford (Skye)
  'EGEL', // Coll
  'EGEN', // North Ronaldsay
  'EGEO', // Oban
  'EGEP', // Papa Westray
  'EGER', // Stronsay
  'EGES', // Sanday
  'EGET', // Tingwall (Shetland)
  'EGEW', // Westray
  'EGEY', // Colonsay
  'EGHC', // Land's End
  'EGHE'  // St Mary's (Scilly)
]);

// Curated relative "size" (1–10) per airport. Used only to scale the FLOOR — it
// gates each route by its smaller endpoint, so Jersey↔London gets a healthy
// leisure floor while Barra↔Colonsay stays tiny. Airports not listed fall back
// to DEFAULT_SIZE by type. (trafficDemand in the DB is uniformly 10, so it can't
// be used as a size signal.)
const SIZE = {
  // London / largest hubs
  EGLL: 10, EGKK: 9, EGSS: 8, EGGW: 8, EGLC: 5,
  // England / Wales / NI regional hubs
  EGCC: 9, EGBB: 8, EGNX: 7, EGGP: 7, EGNT: 7, EGNM: 7, EGGD: 7, EGHI: 7,
  EGHH: 6, EGFF: 6, EGMC: 6, EGNJ: 6, EGNV: 5, EGSH: 5, EGTE: 5, EGHQ: 5,
  EGNH: 3, EGNC: 2, EGNL: 2, EGNR: 2, EGFE: 2, EGFH: 2, EGOV: 2, EGAB: 2,
  EGAA: 7, EGAC: 6, EGAE: 4,
  // Scotland mainland
  EGPH: 8, EGPF: 8, EGPD: 7, EGPK: 6, EGPE: 6, EGPN: 4,
  // Isle of Man
  EGNS: 6,
  // Channel Islands
  EGJJ: 8, EGJB: 6, EGJA: 2,
  // Highlands & Islands
  EGPB: 5, EGPA: 5, EGPO: 4, EGPC: 3, EGPI: 3, EGPL: 3, EGPU: 2, EGPR: 2,
  EGEC: 2, EGED: 2, EGET: 2, EGEO: 2,
  EGEF: 1, EGEH: 1, EGEI: 1, EGEL: 1, EGEN: 1, EGEP: 1, EGER: 1, EGES: 1, EGEW: 1, EGEY: 1,
  // South West / Scilly
  EGHE: 3, EGHC: 3,
  // Civil business/GA majors (kept in scope, low floor)
  EGLF: 2, EGKB: 2, EGTK: 2, EGLK: 1, EGSC: 2, EGBE: 2, EGBN: 2, EGBJ: 2, EGKA: 1, EGMD: 1
};
const DEFAULT_SIZE = { 'International Hub': 6, 'Major': 3, 'Regional': 1 };

// Decades matching demandData's 8-slot score arrays.
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

// Era scaling — leisure/domestic air travel barely existed in 1950 and grew
// through the eras. Derived from gravityCalibration.flyPropensity, normalised so
// 2020 = 1.0. Keeps early eras small-but-non-zero.
const ERA_FACTOR = {
  1950: 0.031, 1960: 0.077, 1970: 0.154, 1980: 0.277,
  1990: 0.431, 2000: 0.615, 2010: 0.846, 2020: 1.0
};

const SCALE = 5;   // peak (2020) floor ≈ smallerEndpointSize × SCALE
const CAP = 45;    // never let the floor alone imply a mega-route

function sizeOf(icao, type) {
  return SIZE[icao] || DEFAULT_SIZE[type] || 2;
}

/**
 * Is this airport in scope for the UK domestic floor?
 * @param {{icaoCode:string, country:string, type:string}} airport
 */
function isInScope(airport) {
  if (!airport || !COUNTRIES.has(airport.country)) return false;
  if (MILITARY.has(airport.icaoCode)) return false;
  if (airport.type === 'International Hub' || airport.type === 'Major') return true;
  if (airport.type === 'Regional' && REGIONAL_INCLUDE.has(airport.icaoCode)) return true;
  return false;
}

/**
 * Compute the 8 decade floor scores for a pair, gated by the smaller endpoint.
 * @param {{icaoCode:string,type:string}} a
 * @param {{icaoCode:string,type:string}} b
 * @returns {number[]} [d1950..d2020], each 1..CAP
 */
function floorScores(a, b) {
  const bottleneck = Math.min(sizeOf(a.icaoCode, a.type), sizeOf(b.icaoCode, b.type));
  const peak = bottleneck * SCALE;
  return DECADES.map(decade => {
    const v = Math.round(peak * ERA_FACTOR[decade]);
    return Math.max(1, Math.min(CAP, v));
  });
}

module.exports = { isInScope, floorScores, DECADES, COUNTRIES, MILITARY, REGIONAL_INCLUDE, SIZE };
