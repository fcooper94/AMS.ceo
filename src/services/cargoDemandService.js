/**
 * Cargo Demand Service — server-side single source of truth for the per-route
 * cargo MARKET (kg/day), so the revenue engine and the route-picker modal agree.
 *
 * This mirrors the derivation the route picker shows in public/js/routes-create.js
 * (BELLY_KG_PER_PAX / COMMERCIAL_KG_PER_PAX / _cargoEraMult / _destCargoIntensity):
 *   route cargo = route pax (magnitude) × destination cargo character (mix).
 * Two pax-linked components, both scaled to the route's PASSENGER market so
 * magnitudes stay realistic and consistent with the pax figures in every era:
 *   - Belly:      bags in a pax aircraft's hold (~20 kg/pax, all General).
 *                 A pure freighter does NOT get this (bags need passengers).
 *   - Commercial: the sellable freight/mail market on the route (~35 kg/pax at
 *                 full maturity), split across cargo types by the destination's
 *                 cargo mix (airportCargoService, incl. per-type era availability,
 *                 e.g. no express pre-1971). BOTH pax aircraft (belly freight) and
 *                 freighters (main deck) tap this pool.
 *
 * ⚠ demandToPax() below is a server port of the same function in
 * public/js/routes-create.js. The front-end can't require server modules, so the
 * two are mirrors — keep them in sync. Both reuse the SAME data tables
 * (gravityCalibration.worldPassengers, data/domesticEraScale) so the pax
 * magnitudes match; only the cosmetic per-airport wobble/floor lift (display-only)
 * is intentionally omitted here — the market math wants the raw magnitude.
 */

const { CARGO_TYPE_KEYS } = require('../config/cargoTypes');
const { worldPassengers } = require('../data/gravityCalibration');
const DOMESTIC_ERA = require('../data/domesticEraScale');

const BELLY_KG_PER_PAX = 20;
const COMMERCIAL_KG_PER_PAX = 35;
const PAX_SCORE100_2020 = 8000; // pax/day for demand score=100 in 2020 (mirrors routes-create.js)

const ERA_KEYS = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

/** Generic piecewise-linear interpolation over the era keys of a {year:value} table. */
function _interpEra(table, year) {
  if (year <= ERA_KEYS[0]) return table[ERA_KEYS[0]];
  if (year >= ERA_KEYS[ERA_KEYS.length - 1]) return table[ERA_KEYS[ERA_KEYS.length - 1]];
  for (let i = 1; i < ERA_KEYS.length; i++) {
    if (year <= ERA_KEYS[i]) {
      const t = (year - ERA_KEYS[i - 1]) / (ERA_KEYS[i] - ERA_KEYS[i - 1]);
      return table[ERA_KEYS[i - 1]] + (table[ERA_KEYS[i]] - table[ERA_KEYS[i - 1]]) * t;
    }
  }
  return table[ERA_KEYS[ERA_KEYS.length - 1]];
}

/**
 * Convert a 0-100 demand score to estimated daily passengers (route market
 * magnitude) for a game year. Mirror of demandToPax() in routes-create.js minus
 * the display-only wobble/floor lift. isDomestic routes use the gentler
 * DOMESTIC_ERA curve (matching how their score was back-projected).
 */
function demandToPax(score, year, isDomestic) {
  if (!score || score <= 0) return 0;
  const y = year || 2020;
  const eraFactor = isDomestic
    ? _interpEra(DOMESTIC_ERA, y)
    : (_interpEra(worldPassengers, y) / worldPassengers[2020]);
  return score * PAX_SCORE100_2020 / 100 * eraFactor;
}

/**
 * Freight-per-pax grew modestly as air freight industrialised (~0.55 in 1950 →
 * 1.0 by 2000). Mirror of _cargoEraMult in routes-create.js.
 */
function cargoEraMult(year) {
  const pts = [[1950, 0.55], [1970, 0.72], [1990, 0.90], [2000, 1.0]];
  if (year <= pts[0][0]) return pts[0][1];
  if (year >= 2000) return 1.0;
  for (let i = 1; i < pts.length; i++) {
    if (year <= pts[i][0]) {
      const t = (year - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
    }
  }
  return 1.0;
}

/** Destination cargo intensity from its General score (typical Major ≈ 0.9, hub ≈ 1.7). */
function destCargoIntensity(cargoProfile) {
  return Math.max(0.4, Math.min(1.7, ((cargoProfile && cargoProfile.general) || 0) / 60));
}

/**
 * Compute the per-route daily cargo MARKET in kg, split into the belly (bags) and
 * commercial (freight/mail per type) pools. Mirrors the route-picker modal.
 *
 * @param {object} p
 * @param {number} p.routePax      - route passenger market/day (from demandToPax)
 * @param {number} p.year          - game year
 * @param {object} p.cargoProfile  - dest airport cargo profile (airportCargoService),
 *                                    per-type 0-100 incl. era availability
 * @returns {{ bellyGeneral: number, commercialByType: Object<string,number> }}
 *          kg/day. bellyGeneral is General only (pax aircraft only). commercialByType
 *          is per-type freight/mail (both pax belly-freight and freighters tap it).
 */
function routeCargoMarket({ routePax, year, cargoProfile }) {
  const pax = Math.max(0, routePax || 0);
  const bellyGeneral = pax * BELLY_KG_PER_PAX; // all General (bags)

  const commercialByType = {};
  const profile = cargoProfile || {};
  const commercialTotal = pax * COMMERCIAL_KG_PER_PAX * cargoEraMult(year) * destCargoIntensity(profile);

  // Split commercial freight across types by the destination's cargo mix (which
  // already bakes in per-type era availability, e.g. express ~0 pre-1971).
  const rawScores = CARGO_TYPE_KEYS.map(k => profile[k] || 0);
  const rawSum = rawScores.reduce((a, b) => a + b, 0);
  CARGO_TYPE_KEYS.forEach((k, i) => {
    commercialByType[k] = rawSum > 0 ? commercialTotal * rawScores[i] / rawSum : 0;
  });

  return { bellyGeneral, commercialByType };
}

module.exports = {
  BELLY_KG_PER_PAX,
  COMMERCIAL_KG_PER_PAX,
  demandToPax,
  cargoEraMult,
  destCargoIntensity,
  routeCargoMarket,
};
