/**
 * US Domestic Demand Service
 *
 * The US analogue of ukDomesticDemandService. Anchors US↔US demand to real BTS
 * T-100 Domestic Segment data (2024) instead of the gravity model:
 *
 *   1. REAL-DATA OVERRIDE. For every route with real 2024 traffic
 *      (src/data/usDomesticReal2024.json — both-directions daily pax, from
 *      generateUsDomesticData.js), back-project the figure through the eras with
 *      an archetype history curve and OVERRIDE the gravity model.
 *   2. GRAVITY SUPPRESSION. For any US↔US pair the gravity model has but that
 *      isn't in the real data (i.e. wasn't flown in 2024), replace it with a
 *      small floor — same reasoning as the UK: gravity wildly overestimates
 *      domestic pairs that aren't really flown.
 *
 * International demand to/from US airports still comes from the gravity model.
 *
 * Back-projection anchors mirror routes-create.js demandToPax (see
 * ukDomesticDemandService for the full rationale). US domestic history differs
 * markedly from the UK: air travel was already substantial in 1950 (no rail
 * dominance), and 1978 DEREGULATION is the great inflection — hub-and-spoke and
 * the LCCs. Alaska and Hawaii routes are lifelines: higher in 1950 (Alaska
 * depended on air; Hawaii inter-island was always significant) and fairly flat.
 */

const DOMESTIC_ERA = require('../data/domesticEraScale'); // gentler era curve; see that file
const PAX_SCORE100 = 8000;
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

// Each route's daily pax as a fraction of its 2024 level, per decade. Signed off
// 2026-07. Steep 1970→1990 climb = post-deregulation surge; leisure grows from
// near-nil with mass tourism + LCCs; Alaska/Hawaii lifeline starts high & flat.
const US_HISTORY_PROFILES = {
  business: [0.05, 0.14, 0.35, 0.60, 0.85, 1.00, 1.00, 1.00],
  leisure:  [0.02, 0.08, 0.28, 0.55, 0.85, 1.05, 1.05, 1.00],
  lifeline: [0.20, 0.35, 0.55, 0.75, 0.90, 1.00, 1.00, 1.00],
  regional: [0.03, 0.10, 0.30, 0.55, 0.90, 1.10, 1.05, 1.00]
};

// US + territory ICAO space: CONUS (K), Alaska (PA), Hawaii (PH), Guam/Marianas
// (PG), Wake/Midway (PW/PM), Puerto Rico/USVI (TJ), plus a couple of Pacific.
const US_ICAO = /^(K|P[AHOMWG]|T[IJ])/;

function isUsAirport(airport) {
  return !!airport && US_ICAO.test(airport.icaoCode || '');
}

let REAL_ROUTES = null;
function realRoutes() {
  if (REAL_ROUTES === null) {
    try {
      REAL_ROUTES = require('../data/usDomesticReal2024.json');
    } catch (err) {
      console.warn(`[usDomesticDemand] real-2024 data unavailable (${err.message}) — skipping.`);
      REAL_ROUTES = {};
    }
  }
  return REAL_ROUTES;
}

/**
 * Back-project a real 2024 daily-pax figure into 8 per-decade demand scores,
 * shaped by archetype. Inverts demandToPax so each decade reproduces
 * `pax × US_HISTORY_PROFILES[arch][decade]` passengers.
 * @param {number} pax  2024 daily passengers, both directions
 * @param {string} arch archetype key
 * @returns {number[]} [d1950..d2020], each 1..100
 */
function realRouteScores(pax, arch) {
  const profile = US_HISTORY_PROFILES[arch] || US_HISTORY_PROFILES.regional;
  return DECADES.map((decade, d) => {
    const targetPax = pax * profile[d];
    const score = Math.round(targetPax * 100 / (PAX_SCORE100 * DOMESTIC_ERA[decade]));
    return Math.max(1, Math.min(100, score));
  });
}

// Floor used to suppress gravity on US↔US pairs with no real 2024 service. Small
// (a notional ~40 pax/day, regional-shaped), so unserved pairs never out-rank
// served ones. Constant — computed once.
const FLOOR_SCORES = realRouteScores(40, 'regional');
function floorScores() {
  return FLOOR_SCORES;
}

module.exports = {
  isUsAirport, realRoutes, realRouteScores, floorScores,
  DECADES, US_HISTORY_PROFILES
};
