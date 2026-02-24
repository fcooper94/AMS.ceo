/**
 * Airport Cargo Demand Service
 *
 * Computes per-cargo-type demand (0–100) for an airport, combining:
 *   1. Cargo type base demand
 *   2. Era factor (air freight grew massively from the 1970s onwards)
 *   3. Type-specific era factor (express barely existed pre-1977)
 *   4. Airport type multiplier
 *   5. Airport traffic demand scale
 *   6. Known cargo hub profile overrides
 */

const { CARGO_TYPES } = require('../config/cargoTypes');
const CARGO_HUB_PROFILES = require('../data/cargoHubProfiles');

/**
 * Overall era factor for air cargo.
 * Air freight was minimal pre-1955 and grew steadily through the widebody era.
 */
function _eraFactor(year) {
  if (year < 1945) return 0.08;
  if (year < 1955) return 0.15;
  if (year < 1965) return 0.30;
  if (year < 1975) return 0.50;
  if (year < 1985) return 0.70;
  if (year < 1995) return 0.85;
  return 1.0;
}

/**
 * Type-specific era multiplier — some cargo categories only became viable
 * (or took off commercially) in specific historical periods.
 */
function _typeEraFactor(cargoKey, year) {
  switch (cargoKey) {
    case 'express':
      // FedEx founded 1971; integrator model exploded after 1977 deregulation
      if (year < 1971) return 0.04;
      if (year < 1977) return 0.18;
      if (year < 1985) return 0.50;
      if (year < 1995) return 0.78;
      return 1.0;

    case 'highValue':
      // Grows with globalisation and secure logistics networks
      if (year < 1960) return 0.35;
      if (year < 1980) return 0.60;
      if (year < 2000) return 0.82;
      return 1.0;

    case 'oversized':
      // Boeing 747 (1969) enabled practical outsized freight
      if (year < 1969) return 0.20;
      if (year < 1980) return 0.60;
      return 1.0;

    case 'dangerous':
      // IATA DGR regulations formalised through the 1970s–80s
      if (year < 1970) return 0.40;
      if (year < 1985) return 0.70;
      return 1.0;

    case 'perishable':
      // Cold-chain air freight grew with consumer demand for fresh produce
      if (year < 1960) return 0.30;
      if (year < 1980) return 0.60;
      if (year < 2000) return 0.85;
      return 1.0;

    case 'liveAnimal':
      // Relatively flat but grew with international pet/livestock trade
      if (year < 1960) return 0.50;
      if (year < 1985) return 0.80;
      return 1.0;

    default:
      return 1.0;
  }
}

/** Map airport type string → base multiplier */
const TYPE_MULT = {
  'International Hub': 1.25,
  'Major':             1.0,
  'Regional':          0.55,
  'Small Regional':    0.25,
};

/**
 * Compute cargo demand profile for a single airport in a given game year.
 *
 * @param {object} airport  - Airport model instance (needs .icaoCode, .type, .trafficDemand)
 * @param {number} gameYear - Current in-game year
 * @returns {object}        - { general, express, heavy, oversized, perishable, dangerous, liveAnimal, highValue }
 *                            Each value is an integer 0–100
 */
function computeAirportCargoDemand(airport, gameYear) {
  const era     = _eraFactor(gameYear);
  const typeMult = TYPE_MULT[airport.type] || 1.0;

  // trafficDemand 1–20 → scale 0.55–1.45
  const td = Math.min(20, Math.max(1, airport.trafficDemand || 10));
  const trafficScale = 0.55 + ((td - 1) / 19) * 0.90;

  const rawProfile = CARGO_HUB_PROFILES[airport.icaoCode] || {};
  // Only apply hub multipliers if the airport had established its cargo role by gameYear
  const hubActive  = !rawProfile.activeFrom || gameYear >= rawProfile.activeFrom;
  const profile    = hubActive ? rawProfile : {};
  const result     = {};

  for (const [key, type] of Object.entries(CARGO_TYPES)) {
    const typeEra   = _typeEraFactor(key, gameYear);
    const hubMult   = profile[key] || 1.0;

    // Base: use 60 as anchor so typical major hub ≈ 70–85 for general
    let demand = type.baseDemand * 60 * era * typeEra * typeMult * trafficScale * hubMult;
    result[key] = Math.min(100, Math.max(0, Math.round(demand)));
  }

  return result;
}

/**
 * Batch compute cargo demand for multiple airports.
 *
 * @param {object[]} airports
 * @param {number}   gameYear
 * @returns {object} - Map of airport.id → cargo demand profile
 */
function computeBatchCargoDemand(airports, gameYear) {
  const out = {};
  for (const airport of airports) {
    out[airport.id] = computeAirportCargoDemand(airport, gameYear);
  }
  return out;
}

module.exports = { computeAirportCargoDemand, computeBatchCargoDemand };
