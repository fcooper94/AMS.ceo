/**
 * AI Spawning Service
 * Generates AI airlines when a single-player world is created.
 * Spawns hundreds of AI airlines across top airports globally.
 */

const { Op } = require('sequelize');
const { WorldMembership, Airport, UserAircraft } = require('../models');
const crypto = require('crypto');
const { generateAIAirline } = require('../data/aiAirlineNames');
const { AI_DIFFICULTY, pickPersonality } = require('../data/aiDifficultyConfig');
const { pickAIContractorTier } = require('../data/contractorConfig');
const eraEconomicService = require('./eraEconomicService');

/**
 * Map a country to a broad region for name generation
 */
function getRegionFromCountry(country) {
  const regionMap = {
    // Europe
    'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Switzerland': 'Europe',
    'Austria': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe',
    'Finland': 'Europe', 'Ireland': 'Europe', 'Portugal': 'Europe', 'Greece': 'Europe',
    'Poland': 'Europe', 'Czech Republic': 'Europe', 'Hungary': 'Europe', 'Romania': 'Europe',
    'Turkey': 'Europe', 'Iceland': 'Europe', 'Luxembourg': 'Europe', 'Croatia': 'Europe',
    // North America
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    // Asia
    'China': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
    'Thailand': 'Asia', 'Singapore': 'Asia', 'Malaysia': 'Asia', 'Indonesia': 'Asia',
    'Philippines': 'Asia', 'Vietnam': 'Asia', 'Taiwan': 'Asia', 'Hong Kong': 'Asia',
    // Middle East
    'United Arab Emirates': 'Middle East', 'Saudi Arabia': 'Middle East', 'Qatar': 'Middle East',
    'Bahrain': 'Middle East', 'Oman': 'Middle East', 'Kuwait': 'Middle East', 'Israel': 'Middle East',
    'Jordan': 'Middle East', 'Lebanon': 'Middle East',
    // Africa
    'South Africa': 'Africa', 'Egypt': 'Africa', 'Kenya': 'Africa', 'Nigeria': 'Africa',
    'Morocco': 'Africa', 'Ethiopia': 'Africa', 'Tanzania': 'Africa', 'Ghana': 'Africa',
    // South America
    'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America',
    'Colombia': 'South America', 'Peru': 'South America', 'Ecuador': 'South America',
    // Oceania
    'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
    'Papua New Guinea': 'Oceania'
  };
  return regionMap[country] || 'Europe';
}

/**
 * Generate a registration prefix based on country
 */
function getRegistrationPrefix(country) {
  const prefixes = {
    'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-',
    'Japan': 'JA-', 'Australia': 'VH-', 'Canada': 'C-', 'Brazil': 'PT-',
    'China': 'B-', 'India': 'VT-', 'Italy': 'I-', 'Spain': 'EC-',
    'Netherlands': 'PH-', 'Switzerland': 'HB-', 'Sweden': 'SE-',
    'South Africa': 'ZS-', 'Singapore': '9V-', 'United Arab Emirates': 'A6-',
    'South Korea': 'HL', 'Thailand': 'HS-', 'Turkey': 'TC-'
  };
  return prefixes[country] || 'XX-';
}

/**
 * Generate a random registration for an AI aircraft
 */
function generateRegistration(prefix, existingRegs) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 100; i++) {
    let reg = prefix;
    const suffixLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
    for (let j = 0; j < suffixLen; j++) {
      reg += chars[Math.floor(Math.random() * 26)];
    }
    if (!existingRegs.has(reg)) return reg;
  }
  return prefix + 'AI' + Math.floor(Math.random() * 10000);
}

/**
 * Spawn AI airlines for a single-player world.
 * Uses tier-based approach: top airports get more airlines, lower tiers get fewer.
 */
async function spawnAIAirlines(world, difficulty, humanBaseAirport) {
  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;
  const worldYear = new Date(world.startDate).getFullYear();
  const tiers = config.spawnTiers;
  const totalAirports = tiers.reduce((sum, t) => sum + t.airports, 0);
  const expectedTotal = tiers.reduce((sum, t) => sum + t.airports * t.aiPerAirport, 0);

  console.log(`[AI-SPAWN] Spawning ~${expectedTotal} AI airlines across ${totalAirports} airports for "${world.name}" (${difficulty})`);

  // Collect existing codes in this world
  const existingMembers = await WorldMembership.findAll({
    where: { worldId: world.id },
    attributes: ['airlineCode', 'iataCode', 'airlineName']
  });
  const existingICAO = new Set(existingMembers.map(m => m.airlineCode).filter(Boolean));
  const existingIATA = new Set(existingMembers.map(m => m.iataCode).filter(Boolean));
  const existingNames = new Set(existingMembers.map(m => m.airlineName).filter(Boolean));

  // Get airports with region-weighted selection
  // Sort by type priority (International Hub first) then by traffic_demand
  // This ensures major hubs get tier 1 (most AI airlines) while small airports get tier 3
  const TYPE_PRIORITY = { 'International Hub': 3, 'Major': 2, 'Regional': 1 };
  const regionWeights = config.regionWeights;
  const allEligible = await Airport.findAll({
    where: {
      type: { [Op.in]: ['International Hub', 'Major', 'Regional'] }
    },
    order: [['traffic_demand', 'DESC']]
  });
  // Sort by type priority first, then traffic_demand (DB sort alone isn't enough
  // because traffic_demand has many ties — 3000+ airports all at 10)
  allEligible.sort((a, b) => {
    const typeDiff = (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    if (typeDiff !== 0) return typeDiff;
    return (b.trafficDemand || 0) - (a.trafficDemand || 0);
  });

  // Group airports by region
  const byRegion = {};
  for (const ap of allEligible) {
    const region = getRegionFromCountry(ap.country);
    (byRegion[region] = byRegion[region] || []).push(ap);
  }

  // Allocate airport slots per region based on weights
  const airports = [];
  let remaining = totalAirports;
  const regionEntries = Object.entries(regionWeights).sort((a, b) => b[1] - a[1]);
  for (const [region, weight] of regionEntries) {
    const quota = Math.round(totalAirports * weight / 100);
    const available = byRegion[region] || [];
    const take = Math.min(quota, available.length, remaining);
    airports.push(...available.slice(0, take));
    remaining -= take;
  }

  // Fill any remaining slots (from rounding) with top airports not yet selected
  if (remaining > 0) {
    const used = new Set(airports.map(a => a.id));
    const extras = allEligible.filter(a => !used.has(a.id)).slice(0, remaining);
    airports.push(...extras);
  }

  // Ensure the player's base airport is in the list (even if it didn't make the region quota)
  if (humanBaseAirport && !airports.find(a => a.id === humanBaseAirport.id)) {
    airports.push(humanBaseAirport);
  }

  // Re-sort by type priority then traffic_demand so tier assignment gives major hubs more airlines
  airports.sort((a, b) => {
    const typeDiff = (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    if (typeDiff !== 0) return typeDiff;
    return (b.trafficDemand || 0) - (a.trafficDemand || 0);
  });

  console.log(`[AI-SPAWN] Region distribution: ${regionEntries.map(([r, w]) => `${r}: ${(byRegion[r] || []).length} eligible, ${Math.round(totalAirports * w / 100)} slots`).join(', ')}`);

  if (airports.length === 0) {
    console.warn('[AI-SPAWN] No airports found, aborting');
    return;
  }

  const startingBalance = eraEconomicService.getStartingCapital(worldYear) * config.startingBalanceMultiplier;

  // Build the spawn plan: assign airports to tiers
  let airportIdx = 0;
  let totalCreated = 0;
  const BATCH_SIZE = 50;

  let membershipBatch = [];

  // --- Guaranteed competition at the player's base airport (created FIRST for code priority) ---
  if (humanBaseAirport && config.baseAirportCompetitors) {
    const baseType = humanBaseAirport.type || 'Regional';
    const baseCompConfig = config.baseAirportCompetitors[baseType] || { min: 1, max: 1 };
    const targetCompetitors = baseCompConfig.min + Math.floor(Math.random() * (baseCompConfig.max - baseCompConfig.min + 1));

    console.log(`[AI-SPAWN] Base airport ${humanBaseAirport.icaoCode} (${baseType}): spawning ${targetCompetitors} guaranteed competitors first`);

    const baseRegion = getRegionFromCountry(humanBaseAirport.country);

    for (let b = 0; b < targetCompetitors; b++) {
      const personality = pickPersonality(difficulty);
      const airline = generateAIAirline(baseRegion, worldYear, existingICAO, existingIATA, existingNames, humanBaseAirport.country);
      if (!airline.icaoCode || !airline.iataCode) {
        console.warn(`[AI-SPAWN] Failed to generate codes for base competitor ${b + 1}/${targetCompetitors}`);
        continue;
      }

      existingICAO.add(airline.icaoCode);
      existingIATA.add(airline.iataCode);
      existingNames.add(airline.name);

      const membershipId = crypto.randomUUID();

      membershipBatch.push({
        id: membershipId,
        userId: null,
        worldId: world.id,
        airlineName: airline.name,
        airlineCode: airline.icaoCode,
        iataCode: airline.iataCode,
        region: humanBaseAirport.country,
        baseAirportId: humanBaseAirport.id,
        balance: startingBalance,
        reputation: 45 + Math.floor(Math.random() * 15),
        isAI: true,
        aiPersonality: personality,
        aiLastDecisionTime: null,
        cleaningContractor: pickAIContractorTier(),
        groundContractor: pickAIContractorTier(),
        engineeringContractor: pickAIContractorTier()
      });

      totalCreated++;
    }

    // Flush base airport batch immediately
    if (membershipBatch.length > 0) {
      await flushBatch(membershipBatch);
      membershipBatch = [];
    }

    console.log(`[AI-SPAWN] Base airport competitors created: ${totalCreated}`);
  }

  for (const tier of tiers) {
    const tierEnd = Math.min(airportIdx + tier.airports, airports.length);

    for (; airportIdx < tierEnd; airportIdx++) {
      const airport = airports[airportIdx];
      const region = getRegionFromCountry(airport.country);

      for (let a = 0; a < tier.aiPerAirport; a++) {
        const personality = pickPersonality(difficulty);
        const airline = generateAIAirline(region, worldYear, existingICAO, existingIATA, existingNames, airport.country);
        if (!airline.icaoCode || !airline.iataCode) continue;

        existingICAO.add(airline.icaoCode);
        existingIATA.add(airline.iataCode);
        existingNames.add(airline.name);

        const membershipId = crypto.randomUUID();

        membershipBatch.push({
          id: membershipId,
          userId: null,
          worldId: world.id,
          airlineName: airline.name,
          airlineCode: airline.icaoCode,
          iataCode: airline.iataCode,
          region: airport.country,
          baseAirportId: airport.id,
          balance: startingBalance,
          reputation: 45 + Math.floor(Math.random() * 15),
          isAI: true,
          aiPersonality: personality,
          aiLastDecisionTime: null,
          cleaningContractor: pickAIContractorTier(),
          groundContractor: pickAIContractorTier(),
          engineeringContractor: pickAIContractorTier()
        });

        totalCreated++;

        // Flush batches periodically to avoid excessive memory usage
        if (membershipBatch.length >= BATCH_SIZE) {
          await flushBatch(membershipBatch);
          membershipBatch = [];
          if (totalCreated % 100 === 0) {
            console.log(`[AI-SPAWN] Progress: ${totalCreated} airlines created...`);
          }
        }
      }
    }
  }

  // Flush remaining from main tier loop
  if (membershipBatch.length > 0) {
    await flushBatch(membershipBatch);
    membershipBatch = [];
  }

  console.log(`[AI-SPAWN] Finished spawning ${totalCreated} AI airlines (shell companies, no fleet/routes) across ${airportIdx} airports`);
}

/**
 * Bulk insert a batch of memberships
 */
async function flushBatch(memberships) {
  await WorldMembership.bulkCreate(memberships, { validate: false });
}

/**
 * Get max appropriate passenger capacity for an airport type
 */
function getMaxCapacityForAirport(airportType) {
  switch (airportType) {
    case 'International Hub': return 9999;
    case 'Major':             return 350;
    case 'Regional':          return 200;
    case 'Small Regional':    return 100;
    default:                  return 200;
  }
}

/**
 * Pick an aircraft from a pool, biased toward a preferred type family (commonality)
 */
function pickAircraftWithCommonality(pool, preferredFamily) {
  if (preferredFamily) {
    const sameFamily = pool.filter(ac => `${ac.manufacturer} ${ac.model}` === preferredFamily);
    // 75% chance to pick from same family if available
    if (sameFamily.length > 0 && Math.random() < 0.75) {
      return sameFamily[Math.floor(Math.random() * sameFamily.length)];
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Assign initial fleet to a single AI airline (used by replacement spawning)
 * Respects airport size limits and fleet commonality
 */
async function assignInitialFleet(membership, baseAirport, eraAircraft, config, existingRegs) {
  // Use tier 2 fleet size as default for replacement airlines
  const tierConfig = config.spawnTiers ? config.spawnTiers[1] : null;
  const fleetMin = tierConfig ? tierConfig.fleetSize.min : 2;
  const fleetMax = tierConfig ? tierConfig.fleetSize.max : 4;
  const fleetSize = fleetMin + Math.floor(Math.random() * (fleetMax - fleetMin + 1));

  const regPrefix = getRegistrationPrefix(membership.region);

  // Filter aircraft by airport-appropriate size
  const maxPax = getMaxCapacityForAirport(baseAirport.type);
  const sizeAppropriate = eraAircraft.filter(ac => ac.passengerCapacity <= maxPax);
  const pool = sizeAppropriate.length > 0 ? sizeAppropriate : eraAircraft;

  if (pool.length === 0) return;

  const fleetData = [];
  let preferredFamily = null; // Track first pick for commonality

  for (let i = 0; i < fleetSize; i++) {
    const aircraft = pickAircraftWithCommonality(pool, preferredFamily);

    // Set preferred family from first pick
    if (i === 0) {
      preferredFamily = `${aircraft.manufacturer} ${aircraft.model}`;
    }

    const reg = generateRegistration(regPrefix, existingRegs);
    existingRegs.add(reg);
    const purchasePrice = parseFloat(aircraft.purchasePrice) || 50000000;
    membership.balance = parseFloat(membership.balance) - purchasePrice;

    fleetData.push({
      worldMembershipId: membership.id,
      aircraftId: aircraft.id,
      registration: reg,
      acquisitionType: 'purchase',
      purchasePrice,
      totalFlightHours: Math.floor(Math.random() * 500),
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: new Date(membership.joinedAt || new Date()),
      lastWeeklyCheckDate: new Date(membership.joinedAt || new Date()),
      lastACheckDate: new Date(membership.joinedAt || new Date()),
      lastACheckHours: 0,
      lastCCheckDate: new Date(membership.joinedAt || new Date()),
      lastDCheckDate: new Date(membership.joinedAt || new Date())
    });
  }

  if (fleetData.length > 0) {
    await UserAircraft.bulkCreate(fleetData, { validate: false });
  }
  await membership.save();
}

module.exports = {
  spawnAIAirlines,
  assignInitialFleet
};
