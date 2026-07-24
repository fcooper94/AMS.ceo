/**
 * AI Spawning Service
 * Generates AI airlines when a single-player world is created.
 * Spawns hundreds of AI airlines across top airports globally.
 */

const { Op } = require('sequelize');
const { WorldMembership, Airport, UserAircraft } = require('../models');
const crypto = require('crypto');
const { generateAIAirline } = require('../data/aiAirlineNames');
const { AI_DIFFICULTY, pickPersonality, pickArchetype } = require('../data/aiDifficultyConfig');
const { pickAIContractorTier } = require('../data/contractorConfig');
const eraEconomicService = require('./eraEconomicService');
const { pickAirlineBranding } = require('../../public/js/airline-logo.js');

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

  // Airport selection is anchored on the PLAYER'S BASE so their game feels
  // real: ~40% of slots go to airports within the player's operating theatre
  // (their base airport leading, so home is busy), the rest to top airports
  // around the world (region-weighted). Both pools are woven together so the
  // dense tier-1 slots are shared between local and global hubs.
  const TYPE_PRIORITY = { 'International Hub': 3, 'Major': 2, 'Regional': 1 };
  const regionWeights = config.regionWeights;
  const allEligible = await Airport.findAll({
    where: {
      type: { [Op.in]: ['International Hub', 'Major', 'Regional'] }
    },
    order: [['traffic_demand', 'DESC']]
  });
  // Rank airports by REAL demand mass — the sum of the era's demand scores
  // across every pair from that airport (from the in-memory demand cache).
  // The airports table can't rank: traffic_demand is a flat 10 for all 8K
  // airports and `type` mislabels minor fields as International Hubs (Nauru,
  // Thule…), which used to hand tier-1 slots to arbitrary airports.
  const byTypeTraffic = (a, b) => {
    const typeDiff = (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
    if (typeDiff !== 0) return typeDiff;
    return (b.trafficDemand || 0) - (a.trafficDemand || 0);
  };
  const massOf = new Map();
  try {
    const demandCacheService = require('./demandCacheService');
    if (demandCacheService.isReady()) {
      const decade = Math.min(2020, Math.max(1950, Math.floor(worldYear / 10) * 10));
      const decadeField = `demand${decade}`;
      for (const ap of allEligible) {
        const dests = demandCacheService.getDestinations(ap.id) || [];
        let mass = 0;
        for (const r of dests) mass += (r[decadeField] || 0);
        massOf.set(ap.id, mass);
      }
      console.log(`[AI-SPAWN] Ranked ${massOf.size} airports by ${decadeField} demand mass`);
    }
  } catch (e) {
    console.warn('[AI-SPAWN] Demand cache unavailable — falling back to type/traffic ranking');
  }
  // Demand mass first (real-world importance), type/traffic as tie-break/fallback
  const byImportance = (a, b) => {
    const massDiff = (massOf.get(b.id) || 0) - (massOf.get(a.id) || 0);
    if (massDiff !== 0) return massDiff;
    return byTypeTraffic(a, b);
  };
  allEligible.sort(byImportance);

  // ── Local pool: the player's theatre ──────────────────────────────────────
  const LOCAL_RADIUS_NM = 1500;
  const LOCAL_SHARE = 0.4;
  const baseLat = parseFloat(humanBaseAirport?.latitude);
  const baseLon = parseFloat(humanBaseAirport?.longitude);
  const hasBaseCoords = Number.isFinite(baseLat) && Number.isFinite(baseLon);
  const distFromBaseNm = (ap) => {
    const lat = parseFloat(ap.latitude), lon = parseFloat(ap.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Infinity;
    const R = 3440.065;
    const dLat = (lat - baseLat) * Math.PI / 180;
    const dLon = (lon - baseLon) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(baseLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const localTarget = Math.round(totalAirports * LOCAL_SHARE);
  let localList = hasBaseCoords
    ? allEligible.filter(ap => distFromBaseNm(ap) <= LOCAL_RADIUS_NM).slice(0, localTarget)
    : [];
  // The player's own base airport always leads the local pool (tier-1 density
  // at home, on top of the guaranteed base competitors below)
  if (humanBaseAirport) {
    localList = [humanBaseAirport, ...localList.filter(a => a.id !== humanBaseAirport.id)]
      .slice(0, Math.max(localTarget, 1));
  }
  const localIds = new Set(localList.map(a => a.id));

  // ── Global pool: region-weighted top airports elsewhere ───────────────────
  const globalEligible = allEligible.filter(a => !localIds.has(a.id));
  const byRegion = {};
  for (const ap of globalEligible) {
    const region = getRegionFromCountry(ap.country);
    (byRegion[region] = byRegion[region] || []).push(ap);
  }
  const globalTarget = totalAirports - localList.length;
  const globalList = [];
  let remaining = globalTarget;
  const regionEntries = Object.entries(regionWeights).sort((a, b) => b[1] - a[1]);
  for (const [region, weight] of regionEntries) {
    const quota = Math.round(globalTarget * weight / 100);
    const available = byRegion[region] || [];
    const take = Math.min(quota, available.length, remaining);
    globalList.push(...available.slice(0, take));
    remaining -= take;
  }
  if (remaining > 0) {
    const used = new Set(globalList.map(a => a.id));
    globalList.push(...globalEligible.filter(a => !used.has(a.id)).slice(0, remaining));
  }
  globalList.sort(byImportance);

  // ── Weave: 2 local + 3 global per 5 slots so both pools share the dense
  //    top tiers (list order determines tier assignment below) ───────────────
  const airports = [];
  let li = 0, gi = 0;
  while (airports.length < totalAirports && (li < localList.length || gi < globalList.length)) {
    for (let k = 0; k < 2 && li < localList.length; k++) airports.push(localList[li++]);
    for (let k = 0; k < 3 && gi < globalList.length; k++) airports.push(globalList[gi++]);
  }

  console.log(`[AI-SPAWN] Base-proximity split: ${localList.length} airports within ${LOCAL_RADIUS_NM}nm of ${humanBaseAirport?.icaoCode || '?'}, ${globalList.length} global (region-weighted)`);

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
        ...pickAirlineBranding(airline.name),
        region: humanBaseAirport.country,
        baseAirportId: humanBaseAirport.id,
        balance: startingBalance,
        reputation: 45 + Math.floor(Math.random() * 15),
        airlineType: pickArchetype(worldYear),
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
          ...pickAirlineBranding(airline.name),
          region: airport.country,
          baseAirportId: airport.id,
          balance: startingBalance,
          reputation: 45 + Math.floor(Math.random() * 15),
          airlineType: pickArchetype(worldYear),
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
    const { aircraftFamilyKey } = require('../utils/aircraftFamily');
    const sameFamily = pool.filter(ac => aircraftFamilyKey(ac.manufacturer, ac.model) === preferredFamily);
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
      preferredFamily = require('../utils/aircraftFamily').aircraftFamilyKey(aircraft.manufacturer, aircraft.model);
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
