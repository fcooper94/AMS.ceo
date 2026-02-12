/**
 * Gravity Model Calibration Constants
 *
 * Parameters for the zone-based gravity demand model.
 * K_t is computed dynamically during seeding to match historical passenger totals.
 */

module.exports = {
  // World total air passengers (millions) by decade
  // Sources: ICAO, IATA historical statistics, World Bank
  worldPassengers: {
    1950: 31,
    1960: 106,
    1970: 310,
    1980: 748,
    1990: 1025,
    2000: 1672,
    2010: 2628,
    2020: 1807  // COVID-affected but used as anchor
  },

  // Gravity model exponents
  alpha: 0.7,       // AirMass exponent in gravity formula
  gamma: 0.7,       // Distance decay exponent (0.6-1.0 range per air travel literature; lower = less short-haul dominance)

  // FlyRate parameters: FlyRate = A_t * (GDPpc / referenceGDPpc) ^ eta
  eta: 1.2,         // Income elasticity for flying rate (higher = more income-sensitive)
  referenceGDPpc: 45000,  // Reference GDP per capita (2024 USD, roughly US level)

  // A_t: base flying propensity by decade
  // Represents the fraction of population that flies per year at reference income
  flyPropensity: {
    1950: 0.02,     // 2% of reference-income population flies
    1960: 0.05,     // 5%
    1970: 0.10,     // 10%
    1980: 0.18,     // 18%
    1990: 0.28,     // 28%
    2000: 0.40,     // 40%
    2010: 0.55,     // 55%
    2020: 0.65      // 65%
  },

  // Maximum flying rate cap by decade (prevents unrealistic values for very rich small zones)
  maxFlyRate: {
    1950: 0.05,
    1960: 0.12,
    1970: 0.25,
    1980: 0.40,
    1990: 0.55,
    2000: 0.70,
    2010: 0.85,
    2020: 0.95
  },

  // Distance thresholds for filtering
  minDistanceNm: 100,    // Minimum distance for viable air routes
  maxDistanceNm: 10000,  // Maximum distance for viable air routes
  minEffectiveDistanceNm: 800,  // Floor for gravity distance decay (prevents ultra-short domestic from dominating)

  // Minimum demand threshold for storing a route (0-100 scale)
  minDemandThreshold: 3,

  // Decades to compute demand for
  decades: [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]
};
