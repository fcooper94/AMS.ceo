/**
 * AI Difficulty Configuration
 * Defines behaviour parameters for each difficulty level.
 * Spawning volume is the SAME across all difficulties (~800 airlines).
 * Difficulty only affects AI behaviour (pricing, aggression, efficiency).
 */

/**
 * Airline archetypes — define the business model of each AI airline.
 * Set at spawn time and drive route selection, fleet purchases, and pricing.
 *
 * Distribution changes by era:
 *   1950s-60s: mostly regional/domestic, no cargo-only, minimal long-haul
 *   1970s-80s: charter and long-haul emerge, cargo grows
 *   1990s+:    low-cost carriers appear, cargo majors, full spectrum
 */
const AIRLINE_ARCHETYPES = {
  regional: {
    label: 'Regional',
    maxRouteDistance: 800,       // nm
    preferredPaxRange: [20, 80],
    transportType: 'passenger',
    canFlyInternational: false,
    pricingModifier: 1.10,      // Slight premium (fewer alternatives)
  },
  domestic: {
    label: 'Domestic',
    maxRouteDistance: 1500,
    preferredPaxRange: [50, 200],
    transportType: 'passenger',
    canFlyInternational: false,
    pricingModifier: 1.0,
  },
  shortHaul: {
    label: 'Short Haul',
    maxRouteDistance: 2500,
    preferredPaxRange: [80, 250],
    transportType: 'both',
    canFlyInternational: true,
    pricingModifier: 0.97,      // Competitive pricing
  },
  longHaul: {
    label: 'Long Haul',
    maxRouteDistance: 99999,
    minRouteDistance: 1500,      // Won't bother with short routes
    preferredPaxRange: [150, 500],
    transportType: 'both',
    canFlyInternational: true,
    pricingModifier: 1.0,
  },
  cargo: {
    label: 'Cargo',
    maxRouteDistance: 99999,
    preferredPaxRange: [0, 0],  // Cargo only — no pax
    transportType: 'cargo',
    canFlyInternational: true,
    pricingModifier: 1.0,
  },
  fullService: {
    label: 'Full Service',
    maxRouteDistance: 99999,
    preferredPaxRange: [50, 500],
    transportType: 'both',
    canFlyInternational: true,
    pricingModifier: 1.05,      // Slight premium for service
  }
};

/**
 * Archetype distribution by era — weights for random selection at spawn time.
 * Reflects real-world airline industry evolution.
 */
const ARCHETYPE_WEIGHTS_BY_ERA = {
  1950: { regional: 40, domestic: 35, shortHaul: 15, longHaul: 5, cargo: 0, fullService: 5 },
  1960: { regional: 30, domestic: 30, shortHaul: 20, longHaul: 10, cargo: 2, fullService: 8 },
  1970: { regional: 20, domestic: 25, shortHaul: 25, longHaul: 15, cargo: 5, fullService: 10 },
  1980: { regional: 15, domestic: 20, shortHaul: 25, longHaul: 18, cargo: 8, fullService: 14 },
  1990: { regional: 12, domestic: 18, shortHaul: 22, longHaul: 18, cargo: 10, fullService: 20 },
  2000: { regional: 10, domestic: 15, shortHaul: 22, longHaul: 18, cargo: 12, fullService: 23 },
  2010: { regional: 8, domestic: 12, shortHaul: 22, longHaul: 20, cargo: 13, fullService: 25 },
  2020: { regional: 8, domestic: 12, shortHaul: 22, longHaul: 20, cargo: 13, fullService: 25 },
};

/**
 * Pick an airline archetype based on era weights.
 * @param {number} year - World start year
 * @returns {string} - Archetype key
 */
function pickArchetype(year) {
  // Find the nearest decade
  const decades = Object.keys(ARCHETYPE_WEIGHTS_BY_ERA).map(Number).sort((a, b) => a - b);
  let decade = decades[0];
  for (const d of decades) {
    if (year >= d) decade = d;
  }
  const weights = ARCHETYPE_WEIGHTS_BY_ERA[decade];
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'fullService';
}

// Shared spawning config — same for all difficulties
// ~790 airlines: 60×4 + 100×3 + 200×1 = 240+300+200 = 740, plus base airport extras
const SPAWN_TIERS = [
  { airports: 60,  aiPerAirport: 4, fleetSize: { min: 3, max: 6 } },
  { airports: 100, aiPerAirport: 3, fleetSize: { min: 2, max: 4 } },
  { airports: 200, aiPerAirport: 1, fleetSize: { min: 1, max: 2 } }
];

// Regional airport slot distribution (% of total airports per region)
const REGION_WEIGHTS = {
  'Europe': 35,
  'North America': 30,
  'Asia': 15,
  'Middle East': 7,
  'South America': 5,
  'Oceania': 4,
  'Africa': 4
};

// Guaranteed competition at the player's base airport, scaled by airport type
// These are ADDITIONAL airlines beyond what the tier system already assigns
const BASE_AIRPORT_COMPETITORS = {
  'International Hub': { min: 3, max: 4 },
  'Major':            { min: 2, max: 3 },
  'Regional':         { min: 1, max: 2 },
  'Small Regional':   { min: 1, max: 1 }
};

const AI_DIFFICULTY = {
  easy: {
    // Starting conditions
    startingBalanceMultiplier: 1.5,      // 50% more money than player
    maxFleetSize: 8,

    // Decision making
    decisionIntervalGameDays: { min: 3, max: 5 },  // 3-5 day random intervals
    routeSelectionAccuracy: 0.6,         // 60% chance of picking optimal route
    expansionRate: 'slow',

    // Pricing
    pricingStrategy: 'premium',          // Prices slightly above market
    pricingModifier: 1.05,               // Multiplier applied to base ticket price (was 1.15 — too high, killed AI revenue)
    neverUndercuts: true,                // Won't undercut the player

    // Efficiency
    maintenanceEfficiency: 0.8,          // Higher costs due to inefficiency

    // Competition proximity
    competitorProximity: 'far',          // AI bases further from player

    // Personality distribution (weights)
    personalityWeights: {
      conservative: 70,
      balanced: 20,
      aggressive: 10
    },

    // Growth/contraction
    profitCyclesToExpand: 4,             // Need 4 profitable cycles to expand
    lossCyclesToContract: 2,             // Contract after 2 unprofitable cycles
    lossCyclesToBankrupt: 6,             // Go bankrupt after 6 loss cycles
    spawnReplacements: false,            // Don't replace bankrupt AI

    // Intelligence parameters
    playerRouteTargetChance: 0,           // Never deliberately targets player routes
    competitiveResponseChance: 0,         // Does nothing when player enters their routes
    monopolyPriceMultiplier: 1.10,        // Modest monopoly premium
    priceFloor: 1.0,                      // Never prices below market
    maxPriceDropPerCycle: 0,              // Never drops price in response to competition

    spawnTiers: SPAWN_TIERS,
    regionWeights: REGION_WEIGHTS,
    baseAirportCompetitors: {
      'International Hub': { min: 1, max: 2 },
      'Major':            { min: 1, max: 1 },
      'Regional':         { min: 0, max: 1 },
      'Small Regional':   { min: 0, max: 0 }
    }
  },

  medium: {
    startingBalanceMultiplier: 1.2,
    maxFleetSize: 15,

    decisionIntervalGameDays: { min: 1, max: 3 },  // 1-3 day random intervals
    routeSelectionAccuracy: 0.8,
    expansionRate: 'moderate',

    pricingStrategy: 'market',
    pricingModifier: 1.0,
    neverUndercuts: false,

    maintenanceEfficiency: 0.9,

    competitorProximity: 'mixed',

    personalityWeights: {
      conservative: 30,
      balanced: 40,
      aggressive: 30
    },

    profitCyclesToExpand: 3,
    lossCyclesToContract: 3,
    lossCyclesToBankrupt: 5,
    spawnReplacements: true,

    // Intelligence parameters
    playerRouteTargetChance: 0.3,         // 30% chance to target player routes
    competitiveResponseChance: 0.4,       // 40% base chance to respond to player competition
    monopolyPriceMultiplier: 1.15,        // Monopoly premium
    priceFloor: 0.90,                     // Won't go below 90% of market
    maxPriceDropPerCycle: 0.10,           // Max 10% price drop per response
    targetPlayerRoutes: true,

    spawnTiers: SPAWN_TIERS,
    regionWeights: REGION_WEIGHTS,
    baseAirportCompetitors: {
      'International Hub': { min: 4, max: 6 },
      'Major':            { min: 3, max: 4 },
      'Regional':         { min: 2, max: 3 },
      'Small Regional':   { min: 1, max: 2 }
    }
  },

  hard: {
    startingBalanceMultiplier: 1.0,      // Same money as player
    maxFleetSize: 25,

    decisionIntervalGameDays: { min: 0.5, max: 1.5 },  // Half-day to 1.5 day random intervals
    routeSelectionAccuracy: 0.95,
    expansionRate: 'fast',

    pricingStrategy: 'aggressive',
    pricingModifier: 0.92,              // Prices 8% below market (was 0.9 — too aggressive)
    neverUndercuts: false,

    maintenanceEfficiency: 0.95,

    competitorProximity: 'close',        // AI bases near player

    personalityWeights: {
      conservative: 10,
      balanced: 30,
      aggressive: 60
    },

    profitCyclesToExpand: 2,
    lossCyclesToContract: 3,
    lossCyclesToBankrupt: 4,
    spawnReplacements: true,

    // Intelligence parameters
    playerRouteTargetChance: 0.5,         // 50% chance to target player routes
    competitiveResponseChance: 0.8,       // 80% base chance to respond
    monopolyPriceMultiplier: 1.20,        // Strong monopoly premium
    priceFloor: 0.85,                     // Can go as low as 85% of market
    maxPriceDropPerCycle: 0.15,           // Max 15% price drop per response
    targetPlayerRoutes: true,

    spawnTiers: SPAWN_TIERS,
    regionWeights: REGION_WEIGHTS,
    baseAirportCompetitors: {
      'International Hub': { min: 6, max: 8 },
      'Major':            { min: 4, max: 6 },
      'Regional':         { min: 3, max: 4 },
      'Small Regional':   { min: 2, max: 3 }
    }
  }
};

/**
 * Get total expected AI airline count for a difficulty
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {number}
 */
function getAICount(difficulty) {
  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  return config.spawnTiers.reduce((sum, tier) => sum + tier.airports * tier.aiPerAirport, 0);
}

/**
 * Pick an AI personality based on difficulty weights
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {string} - 'aggressive', 'conservative', or 'balanced'
 */
function pickPersonality(difficulty) {
  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  const weights = config.personalityWeights;
  const total = weights.conservative + weights.balanced + weights.aggressive;
  const roll = Math.random() * total;

  if (roll < weights.conservative) return 'conservative';
  if (roll < weights.conservative + weights.balanced) return 'balanced';
  return 'aggressive';
}

module.exports = {
  AI_DIFFICULTY,
  AIRLINE_ARCHETYPES,
  getAICount,
  pickPersonality,
  pickArchetype
};
