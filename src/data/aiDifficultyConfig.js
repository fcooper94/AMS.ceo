/**
 * AI Difficulty Configuration
 * Defines behaviour parameters for each difficulty level
 */

const AI_DIFFICULTY = {
  easy: {
    // Starting conditions
    startingBalanceMultiplier: 1.5,      // 50% more money than player
    maxFleetSize: 8,

    // Decision making
    decisionIntervalGameDays: 30,        // Monthly decisions
    routeSelectionAccuracy: 0.6,         // 60% chance of picking optimal route
    expansionRate: 'slow',

    // Pricing
    pricingStrategy: 'premium',          // Prices 10-20% above market
    pricingModifier: 1.15,               // Multiplier applied to base ticket price
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

    // Tier-based spawning: top airports by traffic demand
    // Each tier: { airports: N, aiPerAirport: M, fleetSize: {min, max} }
    spawnTiers: [
      { airports: 20, aiPerAirport: 3, fleetSize: { min: 3, max: 5 } },
      { airports: 40, aiPerAirport: 2, fleetSize: { min: 2, max: 3 } },
      { airports: 60, aiPerAirport: 1, fleetSize: { min: 1, max: 2 } }
    ]
    // ~200 total AI airlines
  },

  medium: {
    startingBalanceMultiplier: 1.2,
    maxFleetSize: 15,

    decisionIntervalGameDays: 14,        // Biweekly decisions
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

    spawnTiers: [
      { airports: 30, aiPerAirport: 3, fleetSize: { min: 3, max: 5 } },
      { airports: 60, aiPerAirport: 2, fleetSize: { min: 2, max: 3 } },
      { airports: 100, aiPerAirport: 1, fleetSize: { min: 1, max: 2 } }
    ]
    // ~310 total AI airlines
  },

  hard: {
    startingBalanceMultiplier: 1.0,      // Same money as player
    maxFleetSize: 25,

    decisionIntervalGameDays: 7,         // Weekly decisions
    routeSelectionAccuracy: 0.95,
    expansionRate: 'fast',

    pricingStrategy: 'aggressive',
    pricingModifier: 0.9,               // Prices 10% below market
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

    spawnTiers: [
      { airports: 50, aiPerAirport: 3, fleetSize: { min: 4, max: 6 } },
      { airports: 80, aiPerAirport: 2, fleetSize: { min: 2, max: 4 } },
      { airports: 150, aiPerAirport: 1, fleetSize: { min: 1, max: 2 } }
    ]
    // ~460 total AI airlines
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
