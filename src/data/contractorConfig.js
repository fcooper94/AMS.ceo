/**
 * Service Contractor Configuration
 * Defines the 3 contract categories (cleaning, ground, engineering),
 * each with 3 tiers (budget, standard, premium).
 * Monthly costs are in 2024 USD — use eraEconomicService for era scaling.
 */

const CONTRACTORS = {
  cleaning: {
    budget: {
      name: 'QuickShine Aviation',
      shortName: 'QuickShine',
      tagline: 'Fast and affordable cabin turnovers',
      description: 'Cuts corners but keeps costs low. Occasional complaints.',
      monthlyCost2024: 8000,
      cleaningDurationMultiplier: 0.85,   // 15% faster (rushed job)
      qualityScore: 30,
      reputationModifier: -2
    },
    standard: {
      name: 'AeroClean International',
      shortName: 'AeroClean',
      tagline: 'Reliable cabin maintenance you can count on',
      description: 'Industry-standard cleaning with consistent quality.',
      monthlyCost2024: 18000,
      cleaningDurationMultiplier: 1.0,
      qualityScore: 60,
      reputationModifier: 0
    },
    premium: {
      name: 'Prestige Cabin Care',
      shortName: 'Prestige',
      tagline: 'Five-star cabin presentation, every flight',
      description: 'Meticulous deep cleaning. Longer turnarounds but spotless cabins.',
      monthlyCost2024: 35000,
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
      description: 'Quick turnarounds but sloppy service. Baggage issues common.',
      monthlyCost2024: 12000,
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
      description: 'Reliable ground operations with trained staff.',
      monthlyCost2024: 25000,
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
      description: 'Careful, attentive service. Passengers notice the difference.',
      monthlyCost2024: 45000,
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
      description: 'Meets minimum standards. Higher wear rates between checks.',
      monthlyCost2024: 15000,
      maintenanceCostMultiplier: 0.80,     // 20% cheaper maintenance
      wearRateMultiplier: 1.25,            // 25% faster wear
      qualityScore: 30,
      reputationModifier: -1
    },
    standard: {
      name: 'AeroParts Technical Services',
      shortName: 'AeroParts',
      tagline: 'Trusted engineering for your fleet',
      description: 'Standard MRO work with OEM parts and procedures.',
      monthlyCost2024: 30000,
      maintenanceCostMultiplier: 1.0,
      wearRateMultiplier: 1.0,
      qualityScore: 60,
      reputationModifier: 0
    },
    premium: {
      name: 'Apex Aviation Engineering',
      shortName: 'Apex',
      tagline: 'Engineering excellence, zero compromise',
      description: 'Premium MRO with extended component life and proactive care.',
      monthlyCost2024: 55000,
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

function getTotalMonthlyCost(cleaningTier, groundTier, engineeringTier) {
  const c = getContractor('cleaning', cleaningTier);
  const g = getContractor('ground', groundTier);
  const e = getContractor('engineering', engineeringTier);
  return (c?.monthlyCost2024 || 0) + (g?.monthlyCost2024 || 0) + (e?.monthlyCost2024 || 0);
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
  getTotalMonthlyCost,
  pickAIContractorTier
};
