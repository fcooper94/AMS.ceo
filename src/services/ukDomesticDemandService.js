/**
 * UK Domestic Demand Service
 *
 * The zone-based gravity model (see generateDemandData.js) is deliberately
 * selective and knew nothing about many real UK domestic routes: the Channel
 * Islands never entered it at all, and small UK↔UK pairs were dropped below the
 * score-7 cutoff. Players saw "no demand" (no_data) for legitimate routes such
 * as EGBB→EGJJ, and where the model did have a value it wasn't anchored to
 * reality.
 *
 * This module provides two layers for UK↔UK (incl. Crown Dependency) demand,
 * applied at boot by demandCacheService:
 *
 *   1. REAL-DATA OVERRIDE (primary). For every route with real CAA annual-2024
 *      traffic (src/data/ukDomesticReal2024.json — both-directions daily pax),
 *      we back-project the 2024 figure through the eras using an archetype
 *      history curve and store the resulting 8 per-decade scores, OVERRIDING the
 *      gravity model (real ground truth wins).
 *   2. CONNECTIVITY FLOOR (fallback). For any commercial-civil UK pair with no
 *      real 2024 service, a small era-flat floor guarantees non-zero demand in
 *      every era, so "every civil pair, every era" still holds.
 *
 * International demand to/from these airports still comes from the gravity model.
 *
 * Scope for the floor (confirmed with the user, 2026-07): commercial civil only
 * — International Hubs + civil Major + Channel Islands + Scottish island lifeline
 * strips; exclude RAF/RNAS/military bases, BAE Warton, and mainland GA airfields
 * (the latter are type "Regional" and simply not in REGIONAL_INCLUDE).
 *
 * To change the airport set/sizes, history curves, or route archetypes, edit the
 * maps here (archetypes) and in generateUkDomesticData.js (per-route data).
 */

// Back-projection anchors — mirror routes-create.js demandToPax so the scores we
// store reproduce the intended per-era passenger figures:
//   pax/day = score/100 × PAX_SCORE100 × DOMESTIC_ERA[decade]
// A route's own history (grew / peaked / declined) lives in HISTORY_PROFILES; the
// era factor keeps scores in range (see domesticEraScale.js). Keeping them
// separate is what avoids the double-era-scaling bug.
const DOMESTIC_ERA = require('../data/domesticEraScale');
const PAX_SCORE100 = 8000; // pax/day a demand score of 100 implies at era factor 1

// Archetype history: each route's daily pax as a fraction of its 2024 level, per
// decade [1950..2020]. UK domestic did NOT grow ~58× like world travel — it was
// small in 1950, and different route types have very different histories:
//   business  – London trunk/shuttle; grew to a ~2000 peak, eased back with rail.
//   leisure   – Channel Islands / holiday; near-nil in 1950, package-holiday boom,
//               matured by ~2000.
//   lifeline  – Highlands & Islands PSO; small but fairly stable across the eras.
//   regional  – provincial city-city; grew late with LCCs, peaked ~2010, dipped
//               after Flybe's 2020 collapse.
const HISTORY_PROFILES = {
  business: [0.05, 0.15, 0.40, 0.70, 1.05, 1.20, 1.05, 1.00],
  leisure:  [0.03, 0.10, 0.35, 0.75, 1.00, 1.10, 1.00, 1.00],
  lifeline: [0.15, 0.30, 0.55, 0.75, 0.92, 1.00, 1.00, 1.00],
  regional: [0.02, 0.06, 0.20, 0.45, 0.75, 1.05, 1.15, 1.00]
};

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

// The connectivity floor is now a genuine MINIMUM. Real CAA-2024 routes (Layer
// 1) carry every pair that actually operates; the floor only exists so a
// commercial-civil UK pair that has NO scheduled service still reads as a small
// latent demand instead of no_data. It must therefore stay at or below what a
// genuinely-served-but-thin route shows, so unserved pairs never out-rank served
// ones. We express it as a tiny size-nudged "notional 2024 pax" and back-project
// it with the SAME regional history curve used for real regional routes, so the
// two layers are shaped identically. Kept below ~80 pax/day (which a score of 1
// already implies in 2020), so in practice the floor lands at the score-1 minimum
// across the eras — the point is coverage, not magnitude.
const FLOOR_MIN_PAX = 20;    // notional modern daily pax for the smallest pair
const FLOOR_SIZE_STEP = 4;   // + per unit of the smaller endpoint's size

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
 * Compute the 8 decade floor scores for an unserved civil pair — a small latent
 * demand, back-projected with the "regional" history curve so it's shaped like a
 * (very thin) real regional route. See FLOOR_MIN_PAX above.
 * @param {{icaoCode:string,type:string}} a
 * @param {{icaoCode:string,type:string}} b
 * @returns {number[]} [d1950..d2020], each ≥1
 */
function floorScores(a, b) {
  const lo = Math.min(sizeOf(a.icaoCode, a.type), sizeOf(b.icaoCode, b.type));
  const notionalPax = FLOOR_MIN_PAX + lo * FLOOR_SIZE_STEP;
  return realRouteScores(notionalPax, 'regional');
}

// --- Real-data override layer -------------------------------------------------

// Real CAA annual-2024 daily pax per undirected pair: { "EGKK_EGJJ": {pax,arch} }
let REAL_ROUTES = null;
function realRoutes() {
  if (REAL_ROUTES === null) {
    try {
      REAL_ROUTES = require('../data/ukDomesticReal2024.json');
    } catch (err) {
      console.warn(`[ukDomesticDemand] real-2024 data unavailable (${err.message}) — floor only.`);
      REAL_ROUTES = {};
    }
  }
  return REAL_ROUTES;
}

/**
 * Back-project a real 2024 daily-pax figure into 8 per-decade demand scores,
 * shaping the history by archetype. Inverts demandToPax so that, per decade,
 * the stored score reproduces `pax × HISTORY_PROFILES[arch][decade]` passengers.
 *
 * Note on granularity: in 2020 a score of 1 already implies PAX_SCORE100/100 =
 * 80 pax/day, so routes below ~40 pax/day can't be represented more finely and
 * read as ~80/day. Only affects the smallest routes; the load-factor engine caps
 * actual carryings by aircraft/frequency anyway.
 *
 * @param {number} pax  2024 daily passengers, both directions
 * @param {string} arch archetype key into HISTORY_PROFILES
 * @returns {number[]} [d1950..d2020], each 1..100
 */
function realRouteScores(pax, arch) {
  const profile = HISTORY_PROFILES[arch] || HISTORY_PROFILES.regional;
  return DECADES.map((decade, d) => {
    const targetPax = pax * profile[d];
    const score = Math.round(targetPax * 100 / (PAX_SCORE100 * DOMESTIC_ERA[decade]));
    return Math.max(1, Math.min(100, score));
  });
}

module.exports = {
  isInScope, floorScores, realRoutes, realRouteScores,
  DECADES, HISTORY_PROFILES, COUNTRIES, MILITARY, REGIONAL_INCLUDE, SIZE
};
