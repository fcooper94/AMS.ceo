/**
 * Cabin Class Service
 *
 * Computes Economy / Premium Economy / Business / First class demand proportions.
 * Factors: era, GDP of endpoints, distance, airport types, route propensity.
 *
 * Historical timeline:
 *   - Pre-1978: First + Economy only (no business class)
 *   - 1978+: Business class introduced (El Al, then widespread)
 *   - 1992+: Premium Economy introduced (EVA Air, Virgin Atlantic)
 *            Only on medium/long-haul widebody routes (>2000 km)
 *
 * Returns { economy, premiumEconomy, business, first } as integer percentages.
 */

const gravityModelService = require('./gravityModelService');

class CabinClassService {

  /**
   * Base class proportions by decade for a "reference" route
   * (long-haul, high-GDP, hub-to-hub). Actual routes scale from here.
   */
  _getEraBase(year) {
    // These are "reference" proportions for a typical long-haul route.
    // First class has historically been a small minority even on premium routes.
    // Pre-1978: First + Economy only (no business class existed).
    const bases = {
      1950: { first: 0.12, business: 0.00, premEco: 0.00, economy: 0.88 },
      1960: { first: 0.08, business: 0.00, premEco: 0.00, economy: 0.92 },
      1970: { first: 0.06, business: 0.00, premEco: 0.00, economy: 0.94 },
      1980: { first: 0.04, business: 0.12, premEco: 0.00, economy: 0.84 },
      1990: { first: 0.03, business: 0.14, premEco: 0.00, economy: 0.83 },
      2000: { first: 0.02, business: 0.13, premEco: 0.05, economy: 0.80 },
      2010: { first: 0.02, business: 0.11, premEco: 0.09, economy: 0.78 },
      2020: { first: 0.01, business: 0.09, premEco: 0.11, economy: 0.79 }
    };

    const interp = (field) => gravityModelService.interpolateDecadeValue(
      Object.fromEntries(Object.entries(bases).map(([y, v]) => [y, v[field]])),
      year
    );

    const first = interp('first');
    const business = interp('business');
    const premEco = interp('premEco');

    return { first, business, premEco, economy: 1 - first - business - premEco };
  }

  /**
   * Era-aware reference GDP (same as routeIndicatorService)
   */
  _getEraReferenceGdp(year) {
    const eraRef = {
      1950: 8000, 1960: 12000, 1970: 16000, 1980: 22000,
      1990: 28000, 2000: 35000, 2010: 42000, 2020: 45000
    };
    return gravityModelService.interpolateDecadeValue(eraRef, year);
  }

  /**
   * Compute cabin class mix for a route.
   *
   * @param {number} originGdp - GDP per capita of origin country (era-adjusted)
   * @param {number} destGdp - GDP per capita of destination country
   * @param {number} distKm - Great circle distance in km
   * @param {string} originType - Airport type of origin
   * @param {string} destType - Airport type of destination
   * @param {number} year - World year
   * @returns {{ economy: number, premiumEconomy: number, business: number, first: number }}
   */
  computeClassMix(originGdp, destGdp, distKm, originType, destType, year) {
    const base = this._getEraBase(year);

    // Compute business propensity: how much premium demand this route generates
    const propensity = this._computePropensity(originGdp, destGdp, distKm, originType, destType, year);

    // Scale premium shares by propensity (cap total premium at 60%)
    let first = Math.max(0, base.first * propensity);
    let business = Math.max(0, base.business * propensity);

    // Premium economy only on medium/long-haul (widebody routes, >2000 km)
    // Ramps in between 1500-2500 km so there's no hard cutoff
    let premEco = 0;
    if (distKm >= 1500 && base.premEco > 0) {
      const distRamp = distKm < 2500 ? (distKm - 1500) / 1000 : 1.0;
      premEco = base.premEco * distRamp * Math.min(propensity, 1.5);
    }

    const totalPremium = first + business + premEco;
    if (totalPremium > 0.40) {
      const scale = 0.40 / totalPremium;
      first *= scale;
      business *= scale;
      premEco *= scale;
    }

    const economy = 1 - first - business - premEco;

    return {
      economy: Math.round(economy * 100),
      premiumEconomy: Math.round(premEco * 100),
      business: Math.round(business * 100),
      first: Math.round(first * 100)
    };
  }

  /**
   * Business propensity: multiplicative score from GDP, distance, and airport types.
   * Centered around 1.0 for a "typical" route.
   */
  _computePropensity(originGdp, destGdp, distKm, originType, destType, year) {
    const gdpFactor = this._gdpFactor(originGdp, destGdp, year);
    const distFactor = this._distanceFactor(distKm);
    const hubFactor = this._hubFactor(originType, destType);

    return gdpFactor * distFactor * hubFactor;
  }

  /**
   * GDP factor: wealthy routes generate more premium demand.
   */
  _gdpFactor(originGdp, destGdp, year) {
    const eraRef = this._getEraReferenceGdp(year);
    const geoMean = Math.sqrt(originGdp * destGdp);
    return Math.max(0.3, Math.min(1.5, geoMean / eraRef));
  }

  /**
   * Distance factor: short-haul has very little premium demand.
   * Long-haul promotes premium for comfort.
   */
  _distanceFactor(distKm) {
    if (distKm < 500) return 0.15;
    if (distKm < 1000) return 0.35;
    if (distKm < 2000) return 0.60;
    if (distKm < 4000) return 0.90;
    if (distKm < 7000) return 1.10;
    return 1.25;
  }

  /**
   * Hub factor: routes between major hubs carry more business travellers.
   */
  _hubFactor(originType, destType) {
    const typeScore = {
      'International Hub': 1.4,
      'Regional Hub': 1.0,
      'Major': 0.85,
      'Regional': 0.65,
      'Domestic': 0.50,
      'Small': 0.35,
      'Closed': 0.20
    };

    const origScore = typeScore[originType] || 0.65;
    const destScore = typeScore[destType] || 0.65;

    return Math.sqrt(origScore * destScore);
  }
}

const cabinClassService = new CabinClassService();
module.exports = cabinClassService;
