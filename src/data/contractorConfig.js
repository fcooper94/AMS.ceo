/**
 * Service Contractor Configuration
 * Defines the 3 contract categories (cleaning, ground, engineering),
 * each with 3 tiers (budget, standard, premium).
 * Weekly costs are in 2024 USD — use eraEconomicService for era scaling.
 */

const CONTRACTORS = {
  cleaning: {
    budget: {
      name: 'QuickShine Aviation',
      shortName: 'QuickShine',
      tagline: 'Fast and affordable cabin turnovers',
      description: 'Cuts corners but keeps costs low. Passengers notice the difference — expect lower demand on competitive routes.',
      weeklyCost2024: 1850,
      cleaningDurationMultiplier: 0.85,   // 15% faster (rushed job)
      qualityScore: 30,
      reputationModifier: -2
    },
    standard: {
      name: 'AeroClean International',
      shortName: 'AeroClean',
      tagline: 'Reliable cabin maintenance you can count on',
      description: 'Industry-standard cleaning with consistent quality. Passengers see a well-kept cabin.',
      weeklyCost2024: 4150,
      cleaningDurationMultiplier: 1.0,
      qualityScore: 60,
      reputationModifier: 0
    },
    premium: {
      name: 'Prestige Cabin Care',
      shortName: 'Prestige',
      tagline: 'Five-star cabin presentation, every flight',
      description: 'Meticulous deep cleaning. Longer turnarounds but spotless cabins. Passengers notice — attracts more demand vs competitors.',
      weeklyCost2024: 8100,
      cleaningDurationMultiplier: 1.20,   // 20% slower (thorough job)
      qualityScore: 95,
      reputationModifier: 3
    }
  },

  ground: {
    budget: {
      name: 'TarmacFirst Handling',
      shortName: 'TarmacFirst',
      tagline: 'No-frills ground ops at unbeatable prices',
      description: 'Quick turnarounds but sloppy service. Passengers notice — lost baggage and poor boarding hurts demand on competitive routes.',
      weeklyCost2024: 2750,
      boardingDurationMultiplier: 0.85,    // 15% faster (rushed)
      deboardingDurationMultiplier: 0.85,
      fuellingDurationMultiplier: 0.90,    // 10% faster
      qualityScore: 25,
      reputationModifier: -2
    },
    standard: {
      name: 'GlobalGate Ground Services',
      shortName: 'GlobalGate',
      tagline: 'Professional handling at every gate',
      description: 'Reliable ground operations with trained staff. Passengers experience smooth boarding and handling.',
      weeklyCost2024: 5750,
      boardingDurationMultiplier: 1.0,
      deboardingDurationMultiplier: 1.0,
      fuellingDurationMultiplier: 1.0,
      qualityScore: 60,
      reputationModifier: 0
    },
    premium: {
      name: 'SkyBridge Premium Handling',
      shortName: 'SkyBridge',
      tagline: 'Precision ground ops for premium airlines',
      description: 'Careful, attentive service. Passengers notice the difference — attracts more demand vs competitors.',
      weeklyCost2024: 10400,
      boardingDurationMultiplier: 1.15,    // 15% slower (careful)
      deboardingDurationMultiplier: 1.15,
      fuellingDurationMultiplier: 1.10,    // 10% slower
      qualityScore: 90,
      reputationModifier: 2
    }
  },

  engineering: {
    budget: {
      name: 'EconTech MRO',
      shortName: 'EconTech',
      tagline: 'Cost-effective maintenance solutions',
      description: 'Meets minimum standards. Higher wear rates make your aircraft look old and unsafe — hurting reputation and passenger confidence.',
      weeklyCost2024: 3450,
      maintenanceCostMultiplier: 0.80,     // 20% cheaper maintenance
      wearRateMultiplier: 1.25,            // 25% faster wear
      qualityScore: 30,
      reputationModifier: -1
    },
    standard: {
      name: 'AeroParts Technical Services',
      shortName: 'AeroParts',
      tagline: 'Trusted engineering for your fleet',
      description: 'Standard MRO work with OEM parts and procedures. Keeps your fleet in solid, airworthy condition.',
      weeklyCost2024: 6950,
      maintenanceCostMultiplier: 1.0,
      wearRateMultiplier: 1.0,
      qualityScore: 60,
      reputationModifier: 0
    },
    premium: {
      name: 'Apex Aviation Engineering',
      shortName: 'Apex',
      tagline: 'Engineering excellence, zero compromise',
      description: 'Premium MRO with extended component life and proactive care. Aircraft stay in top condition — boosting reputation and passenger confidence.',
      weeklyCost2024: 12700,
      maintenanceCostMultiplier: 1.30,     // 30% more expensive
      wearRateMultiplier: 0.75,            // 25% slower wear
      qualityScore: 95,
      reputationModifier: 2
    }
  }
};

const DEFAULT_TIER = 'standard';

function getContractor(category, tier) {
  return CONTRACTORS[category]?.[tier] || CONTRACTORS[category]?.[DEFAULT_TIER] || null;
}

function getContractorsByCategory(category) {
  return CONTRACTORS[category] || null;
}

function getTotalWeeklyCost(cleaningTier, groundTier, engineeringTier) {
  const c = getContractor('cleaning', cleaningTier);
  const g = getContractor('ground', groundTier);
  const e = getContractor('engineering', engineeringTier);
  return (c?.weeklyCost2024 || 0) + (g?.weeklyCost2024 || 0) + (e?.weeklyCost2024 || 0);
}

/** Weighted random tier for AI airlines (25% budget, 55% standard, 20% premium) */
function pickAIContractorTier() {
  const roll = Math.random();
  if (roll < 0.25) return 'budget';
  if (roll < 0.80) return 'standard';
  return 'premium';
}

module.exports = {
  CONTRACTORS,
  DEFAULT_TIER,
  getContractor,
  getContractorsByCategory,
  getTotalWeeklyCost,
  pickAIContractorTier
};
