/**
 * Seasonality Service
 *
 * Turns a route's base (0–100) potential demand into glanceable Summer and
 * Winter demand numbers, plus a coarse traffic-type label. Pure / no DB.
 *
 * Archetype is resolved most-specific-first: curated ski/winter-sun/summer-sun
 * lists win, then route character, then a latitude fallback. "Summer"/"Winter"
 * are the warm/cold travel seasons for the market (not calendar months), so
 * hemisphere doesn't change the two displayed numbers.
 */

const {
  ARCHETYPE_FACTORS, SKI_GATEWAYS, SUMMER_SUN, WINTER_SUN, DOMESTIC_LEISURE,
  US_SNOWBIRD, US_SUMMER_BEACH
} = require('../data/seasonalProfiles');

const TROPICAL_LAT = 23.5;
const TEMPERATE_LAT = 35;
const LEISURE_SUMMER_LAT = 40;

// Leisure-air-travel maturity by year. The seasonal *ratio* (ski/beach swing)
// barely existed in 1950 — air travel was overwhelmingly business/premium/VFR
// and mass leisure/charter flying only matured through the 1960s–80s. So the
// archetype swing is blended toward flat in early eras. 0.10 floor (not 0):
// the few who flew to ski still did so in winter. Linear between breakpoints.
const SEASONAL_MATURITY = [
  [1950, 0.25],
  [1960, 0.40],
  [1970, 0.60],
  [1980, 0.82],
  [1990, 1.00]
];

function seasonalIntensity(year) {
  const y = parseInt(year, 10);
  if (!Number.isFinite(y)) return 1.0; // unknown year → full (modern) behaviour
  const first = SEASONAL_MATURITY[0];
  const last = SEASONAL_MATURITY[SEASONAL_MATURITY.length - 1];
  if (y <= first[0]) return first[1];
  if (y >= last[0]) return last[1];
  for (let i = 1; i < SEASONAL_MATURITY.length; i++) {
    const [y1, v1] = SEASONAL_MATURITY[i - 1];
    const [y2, v2] = SEASONAL_MATURITY[i];
    if (y <= y2) return v1 + (v2 - v1) * ((y - y1) / (y2 - y1));
  }
  return last[1];
}

function clamp01to100(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

class SeasonalityService {
  /**
   * @param {Object} originAirport - { icaoCode, latitude }
   * @param {Object} destAirport   - { icaoCode, latitude }
   * @param {string} routeType     - gravity route type (business/leisure/mixed/regional/cargo)
   * @returns {string} archetype key in ARCHETYPE_FACTORS
   */
  resolveArchetype(originAirport, destAirport, routeType) {
    const oIcao = originAirport?.icaoCode;
    const dIcao = destAirport?.icaoCode;
    const oLat = Math.abs(parseFloat(originAirport?.latitude) || 0);
    const dLat = Math.abs(parseFloat(destAirport?.latitude) || 0);
    const rt = (routeType || '').toLowerCase();

    if (SKI_GATEWAYS.has(oIcao) || SKI_GATEWAYS.has(dIcao)) return 'ski';

    if (WINTER_SUN.has(oIcao) || WINTER_SUN.has(dIcao)) return 'winter_sun';
    // Cold/temperate origin → tropical destination, leisure-ish = winter escape
    if (rt !== 'business' && dLat < TROPICAL_LAT && oLat >= TEMPERATE_LAT) return 'winter_sun';

    // US snowbird / Sunbelt markets (Florida, Arizona, desert SW) — gentle winter
    // lean (mixed business + leisure, not a full tropical-escape swing).
    if (US_SNOWBIRD.has(oIcao) || US_SNOWBIRD.has(dIcao)) return 'mild_winter';

    if (SUMMER_SUN.has(oIcao) || SUMMER_SUN.has(dIcao)) return 'summer_sun';

    // US summer beaches — moderate summer bias.
    if (US_SUMMER_BEACH.has(oIcao) || US_SUMMER_BEACH.has(dIcao)) return 'generic_leisure';

    // UK holiday islands/coast: temperate summer leisure, regardless of the
    // business-looking route type their airport sizes imply (e.g. EGBB→EGJJ).
    if (DOMESTIC_LEISURE.has(oIcao) || DOMESTIC_LEISURE.has(dIcao)) return 'generic_leisure';

    if (rt === 'business') return 'business';
    if (rt === 'regional' || rt === 'mixed') return 'leisure';

    if (rt === 'leisure') {
      // Temperate leisure skews summer; year-round-warm pairs stay flat.
      if (Math.max(oLat, dLat) >= LEISURE_SUMMER_LAT) return 'generic_leisure';
      return 'flat';
    }

    return 'flat';
  }

  /**
   * Compute Summer / Winter demand from base potential demand.
   *
   * The archetype swing is damped toward flat in early eras (see
   * SEASONAL_MATURITY) so 1950 ski/beach routes read near-flat and the swing
   * grows as leisure air travel matured.
   *
   * @param {number} [year] - game year; omitted → full (modern) seasonality
   * @returns {{summer:number, winter:number, archetype:string}}
   */
  computeSeasonal(originAirport, destAirport, baseDemand, routeType, year) {
    const archetype = this.resolveArchetype(originAirport, destAirport, routeType);
    const f = ARCHETYPE_FACTORS[archetype] || ARCHETYPE_FACTORS.flat;
    const base = parseFloat(baseDemand) || 0;
    const intensity = seasonalIntensity(year);
    // Blend each factor toward 1.0 (flat) by the era maturity intensity.
    const eff = (factor) => 1 + (factor - 1) * intensity;
    return {
      summer: clamp01to100(base * eff(f.summer)),
      winter: clamp01to100(base * eff(f.winter)),
      archetype
    };
  }

  /**
   * Coarse traffic-type label.
   * @param {string} routeType - gravity route type (for prospective destinations)
   * @param {string} [transportType] - Route.transportType for an existing route (authoritative)
   * @returns {'Pax'|'Cargo'|'Mixed'}
   */
  trafficType(routeType, transportType) {
    if (transportType) {
      if (transportType === 'cargo_only') return 'Cargo';
      if (transportType === 'passengers_only') return 'Pax';
      return 'Mixed'; // 'both'
    }
    const rt = (routeType || '').toLowerCase();
    if (rt === 'cargo') return 'Cargo';
    if (rt === 'mixed') return 'Mixed';
    return 'Pax';
  }
}

module.exports = new SeasonalityService();
