/**
 * AI Difficulty Configuration
 * Defines behaviour parameters for each difficulty level.
 * Spawning volume is the SAME across all difficulties (~800 airlines).
 * Difficulty only affects AI behaviour (pricing, aggression, efficiency).
 */

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
    decisionIntervalGameDays: 7,          // Weekly decisions (player can act instantly, AI needs to keep pace)
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

    spawnTiers: SPAWN_TIERS,
    regionWeights: REGION_WEIGHTS,
    baseAirportCompetitors: BASE_AIRPORT_COMPETITORS
  },

  medium: {
    startingBalanceMultiplier: 1.2,
    maxFleetSize: 15,

    decisionIntervalGameDays: 3,          // Every few days
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

    spawnTiers: SPAWN_TIERS,
    regionWeights: REGION_WEIGHTS,
    baseAirportCompetitors: BASE_AIRPORT_COMPETITORS
  },

  hard: {
    startingBalanceMultiplier: 1.0,      // Same money as player
    maxFleetSize: 25,

    decisionIntervalGameDays: 1,          // Daily decisions (aggressive, mirrors a competitive player)
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

    spawnTiers: SPAWN_TIERS,
    regionWeights: REGION_WEIGHTS,
    baseAirportCompetitors: BASE_AIRPORT_COMPETITORS
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
  getAICount,
  pickPersonality
};
