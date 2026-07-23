/**
 * AI Decision Service
 * Makes strategic decisions for AI airlines in single-player worlds:
 * - Route creation with player targeting, smart frequency, smart departure times
 * - Competition-aware pricing with cost floors and smoothing
 * - Competitive response to player entering AI routes
 * - Fleet expansion with profitability gates
 * - Network contraction and bankruptcy handling
 *
 * Difficulty scales AI intelligence: Easy is passive, Hard is strategic.
 * Personality (conservative/balanced/aggressive) shapes each decision.
 */

const { WorldMembership, Route, UserAircraft, Aircraft, Airport, ScheduledFlight, Notification, Loan } = require('../models');
const { Op } = require('sequelize');

// AI decision logs gated behind DEBUG_AI (or DEBUG_SIM). Set DEBUG_AI=1 to see.
const DEBUG_AI = process.env.DEBUG_AI === '1' || process.env.DEBUG_SIM === '1';
const aiLog = (...args) => { if (DEBUG_AI) console.log(...args); };
const { AI_DIFFICULTY, AIRLINE_ARCHETYPES, pickPersonality, pickArchetype } = require('../data/aiDifficultyConfig');
const { getAllBanks, calculateOfferRate, calculateFixedPayment, calculateMaxLoanAmount, TERM_RANGES } = require('../data/bankConfig');
const { pickAIContractorTier } = require('../data/contractorConfig');
const eraEconomicService = require('./eraEconomicService');
const routeDemandService = require('./routeDemandService');
const airportSlotService = require('./airportSlotService');

// AI archetypes use their own transport vocabulary ('passenger'/'cargo'/'both');
// the Route model enum expects 'passengers_only'/'cargo_only'/'both'.
const ROUTE_TRANSPORT_TYPE = { passenger: 'passengers_only', cargo: 'cargo_only', both: 'both' };

// ─── Helper functions ────────────────────────────────────────────────

/**
 * Get the human player's membership ID for a world
 */
async function getPlayerMembershipId(worldId) {
  const player = await WorldMembership.findOne({
    where: { worldId, isAI: false, isActive: true },
    attributes: ['id']
  });
  return player?.id || null;
}

/**
 * Create a notification for the player about an AI action
 */
async function notifyPlayer(worldId, title, message, gameTime, opts = {}) {
  try {
    const playerMembershipId = await getPlayerMembershipId(worldId);
    if (!playerMembershipId) return;

    await Notification.create({
      worldMembershipId: playerMembershipId,
      type: opts.type || 'operations',
      icon: opts.icon || 'plane',
      title,
      message,
      link: opts.link || '/competition',
      priority: opts.priority || 4,
      gameTime
    });
  } catch (err) {
    // Non-critical
  }
}

/**
 * Estimate the average used-market sale price for an aircraft type.
 * Mirrors the market-averages logic in routes/fleet.js: it samples the
 * depreciation curve across the plausible age/condition spread for the type
 * and averages the results, scaled by the era multiplier. This keeps AI sale
 * listings in line with "the average price of other aircraft of the same type"
 * rather than a flat fraction of the (undepreciated) new price.
 * Returns { avg, refCondition } (avg rounded, refCondition = mean condition
 * of the sampled fleet so callers can adjust for a specific unit's wear),
 * or null if the type has no base price.
 */
function estimateTypeAverageSalePrice(acType, worldYear) {
  const newPrice = parseFloat(acType.purchasePrice) || 0;
  if (!newPrice) return null;

  const eraMultiplier = worldYear ? eraEconomicService.getEraMultiplier(worldYear) : 1.0;

  // Age range this type could plausibly appear at on the used market
  let maxAge = 25;
  if (acType.availableFrom) maxAge = Math.min(25, worldYear - acType.availableFrom);
  if (maxAge < 0) maxAge = 0;

  const sampleAges = [];
  for (let age = 0; age <= maxAge; age += Math.max(1, Math.floor(maxAge / 8))) sampleAges.push(age);
  if (maxAge > 0 && !sampleAges.includes(maxAge)) sampleAges.push(maxAge);

  const salePrices = [];
  const conditions = [];
  for (const age of sampleAges) {
    // Representative condition for this age bracket (same brackets as fleet.js)
    let condMin, condMax;
    if (age <= 5) { condMin = 85; condMax = 100; }
    else if (age <= 10) { condMin = 60; condMax = 95; }
    else if (age <= 15) { condMin = 40; condMax = 70; }
    else { condMin = 20; condMax = 50; }
    const condMid = (condMin + condMax) / 2;
    conditions.push(condMid);

    // Depreciation factor (same formula as generateUsedAircraft in aircraft.js)
    let depFactor;
    if (age <= 5) depFactor = 0.70 - (age * 0.05);
    else if (age <= 10) depFactor = 0.45 - ((age - 5) * 0.04);
    else if (age <= 15) depFactor = 0.25 - ((age - 10) * 0.03);
    else depFactor = 0.10 - Math.min((age - 15) * 0.01, 0.05);

    depFactor = Math.max(depFactor * (condMid / 100) * 0.95, 0.03); // ~0.95 for check validity
    salePrices.push(newPrice * depFactor * eraMultiplier);
  }

  if (salePrices.length === 0) return null;
  const avg = Math.round(salePrices.reduce((s, v) => s + v, 0) / salePrices.length);
  const refCondition = conditions.reduce((s, v) => s + v, 0) / conditions.length;
  return { avg, refCondition };
}

/**
 * Haversine distance in nautical miles
 */
function calculateDistanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Generate a flight number like "AB123" from IATA code
 */
function generateFlightNumber(iataCode, existingNumbers) {
  for (let i = 0; i < 200; i++) {
    const num = 100 + Math.floor(Math.random() * 900);
    const fn = `${iataCode}${num}`;
    if (!existingNumbers.has(fn)) return fn;
  }
  return `${iataCode}${Math.floor(Math.random() * 9000) + 1000}`;
}

/**
 * Calculate arrival date/time for a route
 */
function calculateArrivalDateTime(departureDate, departureTime, distanceNm, cruiseSpeed, turnaroundMinutes) {
  const depDateTime = new Date(`${departureDate}T${departureTime}`);
  const speed = cruiseSpeed || 450;
  const outboundMinutes = (distanceNm / speed) * 60;
  const returnMinutes = outboundMinutes;
  const totalMinutes = outboundMinutes + (turnaroundMinutes || 45) + returnMinutes;

  const arrDateTime = new Date(depDateTime.getTime() + totalMinutes * 60 * 1000);
  const year = arrDateTime.getFullYear();
  const month = String(arrDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(arrDateTime.getDate()).padStart(2, '0');
  const hours = String(arrDateTime.getHours()).padStart(2, '0');
  const mins = String(arrDateTime.getMinutes()).padStart(2, '0');

  return {
    arrivalDate: `${year}-${month}-${day}`,
    arrivalTime: `${hours}:${mins}:00`
  };
}

/**
 * Get max passenger capacity appropriate for an airport type
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

// ─── New intelligence helpers ────────────────────────────────────────

/**
 * Find player routes that the AI could compete on from its base airport.
 * Returns destination airports sorted by player profitability (most profitable first).
 */
async function getPlayerRouteTargets(worldId, airlineId, baseAirportId, worldYear) {
  const playerRoutes = await Route.findAll({
    where: {
      isActive: true,
      departureAirportId: baseAirportId,
      worldMembershipId: { [Op.ne]: airlineId }
    },
    include: [
      { model: WorldMembership, as: 'membership', where: { isAI: false } },
      { model: Airport, as: 'arrivalAirport', attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type', 'latitude', 'longitude'] }
    ]
  });

  if (playerRoutes.length === 0) {
    // Also check routes arriving at the AI base (player flies TO our base)
    const inboundRoutes = await Route.findAll({
      where: {
        isActive: true,
        arrivalAirportId: baseAirportId,
        worldMembershipId: { [Op.ne]: airlineId }
      },
      include: [
        { model: WorldMembership, as: 'membership', where: { isAI: false } },
        { model: Airport, as: 'departureAirport', attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type', 'latitude', 'longitude'] }
      ]
    });
    // Convert inbound routes to "destination" format (the other end of the route)
    return inboundRoutes
      .sort((a, b) => {
        const profitA = (parseFloat(a.totalRevenue) || 0) - (parseFloat(a.totalCosts) || 0);
        const profitB = (parseFloat(b.totalRevenue) || 0) - (parseFloat(b.totalCosts) || 0);
        return profitB - profitA;
      })
      .map(r => ({ airport: r.departureAirport, demand: r.demand || 50 }));
  }

  return playerRoutes
    .sort((a, b) => {
      const profitA = (parseFloat(a.totalRevenue) || 0) - (parseFloat(a.totalCosts) || 0);
      const profitB = (parseFloat(b.totalRevenue) || 0) - (parseFloat(b.totalCosts) || 0);
      return profitB - profitA;
    })
    .map(r => ({ airport: r.arrivalAirport, demand: r.demand || 50 }));
}

/**
 * Calculate smart frequency based on demand score, aircraft size, and personality.
 * Returns { frequency, daysOfWeek }.
 */
function calculateSmartFrequency(demandScore, aircraftCapacity, personality) {
  const isSmallAircraft = aircraftCapacity < 100;

  let daysPerWeek;
  if (demandScore < 15 && isSmallAircraft) {
    daysPerWeek = 2 + Math.floor(Math.random() * 2); // 2-3
  } else if (demandScore < 15) {
    daysPerWeek = 3;
  } else if (demandScore < 30) {
    daysPerWeek = 3 + Math.floor(Math.random() * 3); // 3-5
  } else if (demandScore < 60) {
    daysPerWeek = 7;
  } else {
    daysPerWeek = 7;
  }

  // Personality modifier
  if (personality === 'aggressive' && demandScore >= 40) {
    daysPerWeek = 7;
  }
  if (personality === 'conservative' && demandScore < 40) {
    daysPerWeek = Math.max(2, daysPerWeek - 1);
  }

  daysPerWeek = Math.min(7, Math.max(2, daysPerWeek));

  if (daysPerWeek === 7) {
    return { frequency: 'daily', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
  }

  // Pick evenly spaced days, always including Mon (1) and Fri (5)
  const days = new Set();
  days.add(1); // Monday
  if (daysPerWeek >= 3) days.add(5); // Friday
  if (daysPerWeek >= 4) days.add(3); // Wednesday
  if (daysPerWeek >= 5) days.add(0); // Sunday
  if (daysPerWeek >= 6) days.add(4); // Thursday

  const allDays = [0, 1, 2, 3, 4, 5, 6];
  while (days.size < daysPerWeek) {
    const remaining = allDays.filter(d => !days.has(d));
    days.add(remaining[Math.floor(Math.random() * remaining.length)]);
  }

  return { frequency: 'weekly', daysOfWeek: [...days].sort((a, b) => a - b) };
}

/**
 * Estimate operating cost per passenger for a route.
 * Used as a price floor — AI should never price below this.
 */
function calculateOperatingCostPerPax(distance, paxCapacity, worldYear) {
  const estimatedPax = Math.round(paxCapacity * 0.75);
  const { totalCosts } = eraEconomicService.calculateFlightCosts(distance * 2, paxCapacity, worldYear, estimatedPax);
  return estimatedPax > 0 ? Math.round(totalCosts / estimatedPax) : totalCosts;
}

/**
 * Count active competing routes on the same airport pair.
 */
async function countCompetitors(route) {
  return Route.count({
    where: {
      [Op.or]: [
        { departureAirportId: route.departureAirportId, arrivalAirportId: route.arrivalAirportId },
        { departureAirportId: route.arrivalAirportId, arrivalAirportId: route.departureAirportId }
      ],
      isActive: true,
      worldMembershipId: { [Op.ne]: route.worldMembershipId }
    }
  });
}

/**
 * Generate a departure time with awareness of route type, personality, and existing competition.
 * Tries to find a time slot with good separation from existing departures.
 */
function generateSmartDepartureTime(routeType, personality, existingDepartures) {
  const peakMorning = [6, 7, 8, 9];
  const peakEvening = [16, 17, 18, 19];
  const midDay = [10, 11, 12, 13, 14, 15];
  const offPeak = [20, 21, 5];

  let hourPool;
  if (routeType === 'business') {
    hourPool = [...peakMorning, ...peakMorning, ...midDay, ...peakEvening];
  } else if (routeType === 'leisure') {
    hourPool = [...peakMorning, ...midDay, ...midDay, ...peakEvening, ...offPeak];
  } else {
    hourPool = [...peakMorning, ...midDay, ...peakEvening];
  }

  if (personality === 'aggressive') {
    hourPool = [...peakMorning, ...peakMorning, ...peakEvening, ...peakEvening, ...midDay];
  }

  // Parse existing departure hours
  const existingHours = (existingDepartures || []).map(t => {
    const parts = String(t).split(':');
    return parseInt(parts[0]) + parseInt(parts[1] || 0) / 60;
  });

  // Try 10 candidates, pick the one with best separation from existing
  let bestHour = hourPool[Math.floor(Math.random() * hourPool.length)];
  let bestGap = -1;

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidateHour = hourPool[Math.floor(Math.random() * hourPool.length)];

    if (existingHours.length === 0) {
      bestHour = candidateHour;
      break;
    }

    const minGap = Math.min(...existingHours.map(eh => {
      const diff = Math.abs(candidateHour - eh);
      return Math.min(diff, 24 - diff);
    }));

    if (minGap > bestGap) {
      bestGap = minGap;
      bestHour = candidateHour;
    }
  }

  const minute = Math.floor(Math.random() * 12) * 5;
  return `${String(bestHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

// ─── Core decision functions ─────────────────────────────────────────

/**
 * Process AI decisions for all AI airlines in a world.
 * Called from worldTimeService on a throttled interval.
 */
async function processAIDecisions(worldId, gameTime) {
  try {
    const World = require('../models/World');
    const world = await World.findByPk(worldId);
    if (!world || world.worldType !== 'singleplayer') return;

    const config = AI_DIFFICULTY[world.difficulty] || AI_DIFFICULTY.medium;
    // Use minimum interval for the cutoff query — individual airlines get random
    // intervals via their own aiLastDecisionTime jitter (set after each cycle)
    const intervalDays = typeof config.decisionIntervalGameDays === 'object'
      ? config.decisionIntervalGameDays.min
      : config.decisionIntervalGameDays;
    const decisionIntervalMs = intervalDays * 24 * 60 * 60 * 1000;

    const decisionCutoff = new Date(gameTime.getTime() - decisionIntervalMs);
    const aiAirlines = await WorldMembership.findAll({
      where: {
        worldId,
        isAI: true,
        isActive: true,
        [Op.or]: [
          { aiLastDecisionTime: null },
          { aiLastDecisionTime: { [Op.lte]: decisionCutoff } }
        ]
      },
      include: [{ model: Airport, as: 'baseAirport' }],
      limit: 10,
      order: [['aiLastDecisionTime', 'ASC']]
    });

    if (aiAirlines.length === 0) return;

    const worldYear = gameTime.getFullYear();

    for (const airline of aiAirlines) {
      try {
        await runDecisionCycle(airline, world, config, gameTime, worldYear);
      } catch (err) {
        console.error(`[AI-DECISION] Error for ${airline.airlineName}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('[AI-DECISION] processAIDecisions error:', error.message);
  }
}

/**
 * Run a single decision cycle for an AI airline.
 * Order: routes → expand → contract → bankruptcy → competitive response → pricing
 */
async function runDecisionCycle(airline, world, config, gameTime, worldYear) {
  await airline.reload();
  const balance = parseFloat(airline.balance) || 0;

  const fleet = await UserAircraft.findAll({
    where: { worldMembershipId: airline.id, status: 'active' },
    include: [{ model: Aircraft, as: 'aircraft' }]
  });

  const routes = await Route.findAll({
    where: { worldMembershipId: airline.id, isActive: true },
    include: [
      { model: Airport, as: 'departureAirport' },
      { model: Airport, as: 'arrivalAirport' }
    ]
  });

  // Days already flown per aircraft (so we can pack several routes onto one
  // aircraft across the week) and whether it already runs a long-haul route.
  const usedDaysByAircraft = {};
  const hasLongHaulByAircraft = {};
  for (const route of routes) {
    if (!route.assignedAircraftId) continue;
    const set = usedDaysByAircraft[route.assignedAircraftId] || (usedDaysByAircraft[route.assignedAircraftId] = new Set());
    (route.daysOfWeek || []).forEach(d => set.add(d));
    if ((parseFloat(route.distance) || 0) >= 2500) hasLongHaulByAircraft[route.assignedAircraftId] = true;
  }
  // Aircraft that can take (more) routes: none yet, or a short/medium airframe with
  // spare days left in its week. Long-haul aircraft keep a single (multi-day) route.
  const unassignedAircraft = fleet.filter(ac => {
    const used = usedDaysByAircraft[ac.id];
    if (!used || used.size === 0) return true;
    if (hasLongHaulByAircraft[ac.id]) return false;
    return used.size <= 4;
  });

  // Assess financial health
  const totalRevenue = routes.reduce((sum, r) => sum + (parseFloat(r.totalRevenue) || 0), 0);
  const totalCosts = routes.reduce((sum, r) => sum + (parseFloat(r.totalCosts) || 0), 0);
  const isProfitable = totalRevenue > totalCosts || routes.length === 0;

  // Average route profitability (for expansion gate)
  const avgProfitPerRoute = routes.length > 0
    ? (totalRevenue - totalCosts) / routes.length
    : 0;

  // 1. Create routes for aircraft that still have spare capacity in their week
  if (unassignedAircraft.length > 0) {
    await tryCreateRoutes(airline, world, config, unassignedAircraft, routes, gameTime, worldYear, usedDaysByAircraft);
  }

  // 2. Expand. New routes look unprofitable while they mature (~8-12 weeks), so
  //    don't require existing routes to already be in profit — expand while the
  //    airline is financially healthy, and only hold back if it's actually
  //    bleeding cash.
  const startingCapital = eraEconomicService.getStartingCapital(worldYear);
  const expansionThreshold = startingCapital * 0.3;
  const isFreshStart = fleet.length === 0 && routes.length === 0;
  const bleedingBadly = avgProfitPerRoute < 0 && balance < startingCapital * 0.5;
  const canExpand = balance > expansionThreshold && fleet.length < config.maxFleetSize && !bleedingBadly;

  if (canExpand) {
    // Quick-start: AI grows fast for the first ~6 game weeks to keep the early game
    // lively and competitive, then eases into a realistic pace. earlyBoost fades
    // 1 → 0 across that window.
    const worldAgeDays = world.startDate
      ? Math.max(0, (gameTime.getTime() - new Date(world.startDate).getTime()) / 86400000)
      : 999;
    const earlyBoost = Math.max(0, 1 - worldAgeDays / 42);

    // Base ramp by fleet size (the realistic later-game pace), lifted during the
    // quick-start window so new AI airlines get established quickly.
    let expandChance = fleet.length < 3 ? 0.9 : fleet.length < 6 ? 0.6 : 0.35;
    expandChance = Math.min(1, expandChance + earlyBoost * 0.5);

    // In the strong early phase a small airline can pick up two aircraft in one
    // cycle, so the map fills out fast at the start.
    const maxBuys = (earlyBoost > 0.6 && fleet.length < 4) ? 2 : 1;
    for (let i = 0; i < maxBuys; i++) {
      if (isFreshStart || Math.random() < expandChance) {
        await tryBuyAircraft(airline, world, config, fleet, worldYear, gameTime);
      } else {
        break;
      }
    }
  }

  // 3. Cancel clearly bleeding individual routes (even if airline overall is OK)
  if (routes.length > 1) {
    const matureRoutes = routes.filter(r => (parseInt(r.totalFlights) || 0) >= 10);
    const bleeding = matureRoutes.filter(r => {
      const rev = parseFloat(r.totalRevenue) || 0;
      const cost = parseFloat(r.totalCosts) || 0;
      return cost > 0 && rev / cost < 0.7; // Revenue covers less than 70% of costs
    });
    if (bleeding.length > 0) {
      await tryContractNetwork(airline, bleeding, config, world, gameTime);
    }
  }

  // 4. Contract if losing money significantly (existing logic)
  if (!isProfitable && routes.length > 1 && balance < startingCapital * 0.1) {
    await tryContractNetwork(airline, routes, config, world, gameTime);
  }

  // 5. Bankruptcy check
  if (balance < 0) {
    const deficit = Math.abs(balance);

    if (routes.length > 0 && deficit > startingCapital * 0.5) {
      // Desperate: allow cutting the worst route even if only marginally bad.
      await tryContractNetwork(airline, routes, config, world, gameTime, { force: true });
    }

    if (balance < -startingCapital * 1.5 || (routes.length === 0 && fleet.length === 0)) {
      aiLog(`[AI-DECISION] ${airline.airlineName} has gone bankrupt (balance: $${Math.round(balance)})`);
      airline.isActive = false;
      await airline.save();

      await Route.update({ isActive: false }, { where: { worldMembershipId: airline.id } });
      await ScheduledFlight.destroy({
        where: { routeId: { [Op.in]: routes.map(r => r.id) } }
      });

      await notifyPlayer(world.id,
        `${airline.airlineName} Ceased Operations`,
        `${airline.airlineName} (${airline.airlineCode}) has gone bankrupt and ceased all operations.`,
        gameTime,
        { type: 'operations', icon: 'alert', priority: 3, link: '/competition' }
      );

      if (config.spawnReplacements) {
        scheduleReplacementSpawn(world, config, gameTime);
      }
      return;
    }
  }

  // 6. Fleet upgrades — replace obsolete aircraft
  if (fleet.length > 0 && Math.random() < 0.15) { // 15% chance per cycle to consider upgrades
    await tryUpgradeFleet(airline, world, config, fleet, routes, worldYear, gameTime);
  }

  // 6b. Airship acquisition + sightseeing tour — personality-gated, max 1 per airline
  if (airline.aiPersonality !== 'conservative' && fleet.length >= 3) {
    const hasAirship = fleet.some(ua => ua.aircraft?.type === 'Airship');
    if (!hasAirship && Math.random() < 0.08) { // ~8% per tick for aggressive/balanced
      await tryAcquireAirship(airline, world, worldYear, gameTime, fleet);
    }
  }

  // 7. Competitive response (medium/hard only)
  if (routes.length > 0 && config.competitiveResponseChance > 0) {
    await checkCompetitiveResponse(airline, routes, config, world, gameTime, worldYear);
  }

  // 7. Adjust pricing (competition-aware)
  if (routes.length > 0) {
    await adjustPricing(airline, routes, config, worldYear, world, gameTime);
  }

  // Update last decision time with random jitter so airlines don't all act in lockstep.
  // Each airline gets a random offset within the interval range, making the world feel alive.
  const interval = config.decisionIntervalGameDays;
  const minDays = typeof interval === 'object' ? interval.min : interval;
  const maxDays = typeof interval === 'object' ? interval.max : interval;
  const jitterDays = minDays + Math.random() * (maxDays - minDays);
  // Shift the "last decision" forward so the NEXT decision fires after jitterDays
  // (the cutoff query uses min interval, so we offset from gameTime to create the spread)
  const nextDecisionAt = new Date(gameTime.getTime() + (jitterDays - minDays) * 24 * 60 * 60 * 1000);
  airline.aiLastDecisionTime = nextDecisionAt;
  await airline.save();
}

/**
 * Try to create routes for aircraft that have none.
 * Includes player targeting, smart frequency, smart departure times, proper range check.
 */
async function tryCreateRoutes(airline, world, config, unassignedAircraft, existingRoutes, gameTime, worldYear, usedDaysByAircraft = {}) {
  if (!airline.baseAirportId) return;

  // Get top destination opportunities by demand
  let opportunities;
  try {
    opportunities = await routeDemandService.getTopDestinations(
      airline.baseAirportId, worldYear, 20
    );
  } catch (err) {
    opportunities = [];
  }

  if (!opportunities || opportunities.length === 0) {
    const airports = await Airport.findAll({
      where: { id: { [Op.ne]: airline.baseAirportId } },
      order: [['traffic_demand', 'DESC']],
      limit: 20
    });
    opportunities = airports.map(ap => ({ airport: ap, demand: 50 }));
  }

  // Filter out destinations we already fly to
  const existingDestIds = new Set(existingRoutes.map(r => r.arrivalAirportId));
  let newOpportunities = opportunities.filter(o => {
    const apId = o.airport?.id || o.id;
    return !existingDestIds.has(apId);
  });

  // Player route targeting (medium/hard)
  if (config.targetPlayerRoutes && config.playerRouteTargetChance > 0) {
    if (Math.random() < config.playerRouteTargetChance) {
      try {
        const playerTargets = await getPlayerRouteTargets(world.id, airline.id, airline.baseAirportId, worldYear);
        const filteredTargets = playerTargets.filter(t => t.airport && !existingDestIds.has(t.airport.id));
        if (filteredTargets.length > 0) {
          const targetCount = Math.min(filteredTargets.length, airline.aiPersonality === 'aggressive' ? 2 : 1);
          newOpportunities.unshift(...filteredTargets.slice(0, targetCount));
        }
      } catch (err) {
        // Non-critical — fall back to demand-based selection
      }
    }
  }

  if (newOpportunities.length === 0) return;

  // Apply route selection accuracy (lower difficulty = more random)
  const sorted = [...newOpportunities];
  if (Math.random() > config.routeSelectionAccuracy) {
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }

  const existingFlightNums = new Set(
    existingRoutes.flatMap(r => [r.routeNumber, r.returnRouteNumber].filter(Boolean))
  );

  const baseAirport = await Airport.findByPk(airline.baseAirportId);
  if (!baseAirport) return;

  // Pre-query existing departure times on routes from our base (for smart scheduling)
  const competingRoutes = await Route.findAll({
    where: {
      departureAirportId: airline.baseAirportId,
      isActive: true,
      worldMembershipId: { [Op.ne]: airline.id }
    },
    attributes: ['id', 'arrivalAirportId', 'scheduledDepartureTime']
  });

  for (const aircraft of unassignedAircraft) {
    if (sorted.length === 0) break;

    const destData = sorted.shift();
    let destAirport = destData.airport || destData;
    if (!destAirport.id) continue;

    if (!destAirport.latitude || !destAirport.longitude) {
      destAirport = await Airport.findByPk(destAirport.id);
      if (!destAirport) continue;
    }

    // Distance calculation
    const distance = calculateDistanceNm(
      parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude),
      parseFloat(destAirport.latitude), parseFloat(destAirport.longitude)
    );

    // Archetype constraints
    const archetype = AIRLINE_ARCHETYPES[airline.airlineType] || AIRLINE_ARCHETYPES.fullService;
    if (distance > (archetype.maxRouteDistance || 99999)) continue;
    if (archetype.minRouteDistance && distance < archetype.minRouteDistance) continue;
    if (!archetype.canFlyInternational && baseAirport.country !== destAirport.country) continue;

    // Proper aircraft range check
    const rangeNm = aircraft.aircraft?.rangeNm;
    const maxRange = rangeNm || (aircraft.aircraft?.cruiseSpeed || 450) * 12;
    if (distance > maxRange * 0.95) continue; // 5% buffer for winds/routing

    // Check slot availability
    try {
      const slotCheck = await airportSlotService.canCreateRoute(
        airline.baseAirportId, destAirport.id, world.id
      );
      if (!slotCheck.allowed) continue;
    } catch (err) {
      continue;
    }

    // Generate flight numbers
    const outboundNum = generateFlightNumber(airline.iataCode, existingFlightNums);
    existingFlightNums.add(outboundNum);
    const returnNum = generateFlightNumber(airline.iataCode, existingFlightNums);
    existingFlightNums.add(returnNum);

    // Calculate pricing
    const archetypePriceMod = archetype.pricingModifier || 1.0;
    const economyPrice = Math.round(eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy') * config.pricingModifier * archetypePriceMod);
    const businessPrice = Math.round(economyPrice * 2.5);
    const firstPrice = Math.round(economyPrice * 4);

    // Turnaround time
    const paxCapacity = aircraft.aircraft?.passengerCapacity || 150;
    let turnaroundTime = 45;
    if (paxCapacity > 250) turnaroundTime = 75;
    else if (paxCapacity > 150) turnaroundTime = 60;
    else if (paxCapacity < 80) turnaroundTime = 30;

    // Smart departure time
    const existingTimesOnPair = competingRoutes
      .filter(r => r.arrivalAirportId === destAirport.id)
      .map(r => r.scheduledDepartureTime);
    const departureTime = generateSmartDepartureTime(
      destData.routeType || 'mixed',
      airline.aiPersonality,
      existingTimesOnPair
    );

    // Smart frequency
    const demandScore = destData.demand || 50;
    const { frequency: smartFreq, daysOfWeek: smartDays } = calculateSmartFrequency(
      demandScore, paxCapacity, airline.aiPersonality
    );

    // Pack this route onto the aircraft's FREE days so one aircraft can run several
    // routes across the week without clashing with its existing flights.
    const used = usedDaysByAircraft[aircraft.id] || new Set();
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const freeDays = dayOrder.filter(d => !used.has(d));
    if (freeDays.length === 0) continue; // aircraft's week is already full
    // Don't stack a long-haul (multi-day) route on top of existing routes.
    if (used.size > 0 && distance >= 2500) continue;
    let routeDays = smartDays.filter(d => freeDays.includes(d));
    if (routeDays.length === 0) {
      routeDays = freeDays.slice(0, Math.max(1, Math.min(freeDays.length, smartDays.length)));
    }

    try {
      const route = await Route.create({
        worldMembershipId: airline.id,
        routeNumber: outboundNum,
        returnRouteNumber: returnNum,
        departureAirportId: airline.baseAirportId,
        arrivalAirportId: destAirport.id,
        assignedAircraftId: aircraft.id,
        distance,
        scheduledDepartureTime: departureTime,
        turnaroundTime,
        frequency: routeDays.length >= 7 ? 'daily' : 'weekly',
        daysOfWeek: routeDays,
        demand: demandScore,
        ticketPrice: economyPrice,
        economyPrice,
        economyPlusPrice: Math.round(economyPrice * 1.3),
        businessPrice,
        firstPrice,
        cargoLightRate: Math.round(distance * 0.5),
        cargoStandardRate: Math.round(distance * 0.8),
        cargoHeavyRate: Math.round(distance * 1.2),
        transportType: ROUTE_TRANSPORT_TYPE[archetype.transportType] || 'both',
        isActive: true
      });

      // Compute airway waypoints
      try {
        const airwayService = require('./airwayService');
        if (airwayService.isReady()) {
          const wps = airwayService.computeRoute(
            parseFloat(baseAirport.latitude), parseFloat(baseAirport.longitude),
            parseFloat(destAirport.latitude), parseFloat(destAirport.longitude),
            baseAirport.icaoCode, destAirport.icaoCode
          );
          if (wps) await route.update({ waypoints: wps });
        }
      } catch (wpErr) { /* non-critical */ }

      // Configure the aircraft's cabin + cargo to match this route (set once, at
      // assignment). Without this the aircraft flies all-economy and earns no
      // premium/cargo revenue. Non-critical — never block route creation on it.
      try {
        const aiFleetConfigService = require('./aiFleetConfigService');
        await aiFleetConfigService.applyRouteConfig(route, aircraft, {
          baseAirport, destAirport, distanceNm: distance, worldYear, archetype: airline.airlineType
        });
      } catch (cfgErr) {
        console.warn(`[AI-DECISION] Cabin/cargo config failed for ${airline.airlineName}: ${cfgErr.message}`);
      }

      await scheduleAIFlights(route, aircraft);

      const freqLabel = smartDays.length === 7 ? 'daily' : `${smartDays.length}x/week`;
      aiLog(`[AI-DECISION] ${airline.airlineName} created route ${outboundNum}: ${baseAirport.icaoCode}-${destAirport.icaoCode} (${distance}nm, ${freqLabel})`);

      // Notify player if this competes with their routes
      const playerCompeting = await Route.findOne({
        where: {
          worldMembershipId: { [Op.ne]: airline.id },
          isActive: true,
          [Op.or]: [
            { departureAirportId: airline.baseAirportId, arrivalAirportId: destAirport.id },
            { departureAirportId: destAirport.id, arrivalAirportId: airline.baseAirportId }
          ]
        },
        include: [{ model: WorldMembership, as: 'membership', where: { isAI: false } }]
      });
      if (playerCompeting) {
        await notifyPlayer(world.id,
          `New Competitor: ${baseAirport.icaoCode}-${destAirport.icaoCode}`,
          `${airline.airlineName} has launched ${outboundNum} on the ${baseAirport.icaoCode}-${destAirport.icaoCode} route (${freqLabel}), competing with your ${playerCompeting.routeNumber}.`,
          gameTime,
          { type: 'operations', icon: 'route', priority: 3, link: '/competition' }
        );
      }
    } catch (err) {
      console.error(`[AI-DECISION] Failed to create route for ${airline.airlineName}: ${err.message}`);
    }
  }
}

/**
 * Schedule weekly flight templates for an AI route
 */
async function scheduleAIFlights(route, aircraft) {
  const cruiseSpeed = aircraft.aircraft?.cruiseSpeed || 450;
  const daysOfWeek = route.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
  const depTime = route.scheduledDepartureTime;
  const distance = parseFloat(route.distance);
  const flightsToCreate = [];

  for (const dow of daysOfWeek) {
    const existing = await ScheduledFlight.findOne({
      where: { routeId: route.id, aircraftId: aircraft.id, dayOfWeek: dow }
    });
    if (existing) continue;

    const refDate = new Date('2024-01-07T00:00:00');
    refDate.setDate(refDate.getDate() + dow);
    const refDateStr = refDate.toISOString().split('T')[0];

    const { arrivalDate: refArrDate, arrivalTime } = calculateArrivalDateTime(
      refDateStr, depTime, distance, cruiseSpeed, route.turnaroundTime
    );

    const arrivalDayOffset = Math.round(
      (new Date(refArrDate + 'T00:00:00') - new Date(refDateStr + 'T00:00:00')) / 86400000
    );

    const [dh, dm] = depTime.split(':').map(Number);
    const [ah, am] = arrivalTime.split(':').map(Number);
    const totalDurationMinutes = (arrivalDayOffset * 1440) + (ah * 60 + am) - (dh * 60 + dm);

    flightsToCreate.push({
      routeId: route.id,
      aircraftId: aircraft.id,
      dayOfWeek: dow,
      departureTime: depTime,
      arrivalTime,
      arrivalDayOffset,
      totalDurationMinutes,
      isActive: true
    });
  }

  if (flightsToCreate.length > 0) {
    await ScheduledFlight.bulkCreate(flightsToCreate);
  }
}

// ─── AI acquisition financing ────────────────────────────────────────
//
// AI airlines vary how they pay for aircraft instead of always leasing:
//   'cash'    — buy outright (full price now), when reserves are ample.
//   'finance' — buy new with a deposit + a fleet-expansion bank loan for the
//               rest (delivered instantly; the loan repays weekly via
//               worldTimeService.processLoanPayments, which already handles AI).
//   'lease'   — low-commitment 1%/week operating lease (the legacy default).
// The mix is weighted by personality and constrained by what the airline can
// actually afford — conservative airlines lean lease/cash, aggressive airlines
// lean on leverage to grow faster.

// Deposit an AI puts down on a financed purchase (rest is the loan principal).
const AI_FINANCE_DEPOSIT_PCT = 0.25;
// Loan term for AI fleet-expansion loans (game weeks; within fleet_expansion range).
const AI_FINANCE_TERM_WEEKS = 156;
// Don't let an AI stack more than this many active loans at once.
const AI_MAX_ACTIVE_LOANS = 3;

// Assumed credit score for an AI airline — better personalities/reputations
// reach cheaper banks. (Human credit scoring is player-oriented; AI uses a
// fixed proxy, like the delivery-settlement path does.)
function aiCreditScore(airline) {
  const base = { conservative: 640, balanced: 580, aggressive: 520 }[airline.aiPersonality] || 570;
  return base;
}

// How far above its cash budget an AI will stretch when financing, as a multiple
// of current cash balance. Aggressive airlines lever up harder.
function aiFinanceMaxPrice(airline, balance) {
  const mult = { conservative: 0.9, balanced: 1.4, aggressive: 2.2 }[airline.aiPersonality] || 1.2;
  return balance * mult;
}

// Base method weights per personality (renormalised over feasible options).
const AI_ACQ_WEIGHTS = {
  conservative: { lease: 0.50, cash: 0.35, finance: 0.15 },
  balanced:     { lease: 0.34, cash: 0.33, finance: 0.33 },
  aggressive:   { lease: 0.25, cash: 0.25, finance: 0.50 }
};

// Build a concrete finance plan (bank, deposit, loan, weekly payment) for a
// purchase, or return null if the AI can't sensibly finance it right now.
function buildAIFinancePlan(airline, purchasePrice, balance, existingLoanBankIds, activeLoanCount, worldYear, fleetValue = 0) {
  if (activeLoanCount >= AI_MAX_ACTIVE_LOANS) return null;
  if (purchasePrice > aiFinanceMaxPrice(airline, balance)) return null;

  const score = aiCreditScore(airline);
  // Eligible: credit accepted, and not already borrowing from that bank.
  const eligible = getAllBanks().filter(b => score >= b.minCreditScore && !existingLoanBankIds.has(b.id));
  if (eligible.length === 0) return null;

  // Prefer a bank matching the airline's risk appetite, else any eligible bank.
  const prefAppetite = { conservative: 'conservative', balanced: 'moderate', aggressive: 'aggressive' }[airline.aiPersonality] || 'moderate';
  let pool = eligible.filter(b => b.riskAppetite === prefAppetite);
  if (pool.length === 0) pool = eligible;

  // Cheapest offered rate in the pool.
  let best = null;
  for (const b of pool) {
    const rate = calculateOfferRate(b.id, score, 'fleet_expansion', worldYear);
    if (best === null || rate < best.rate) best = { bank: b, rate };
  }
  if (!best) return null;

  const deposit = Math.round(purchasePrice * AI_FINANCE_DEPOSIT_PCT);
  const loanAmount = purchasePrice - deposit;

  // Respect the bank's max loan sizing (same net-worth basis as players).
  const maxLoan = calculateMaxLoanAmount(best.bank.id, balance + fleetValue, score);
  if (maxLoan > 0 && loanAmount > maxLoan) return null;

  const termWeeks = Math.max(TERM_RANGES.fleet_expansion.min,
    Math.min(TERM_RANGES.fleet_expansion.max, AI_FINANCE_TERM_WEEKS));
  const weeklyPayment = calculateFixedPayment(loanAmount, best.rate, termWeeks);

  // Need the deposit plus ~8 weeks of repayment runway after paying it.
  if (balance < deposit + weeklyPayment * 8) return null;

  return { bankId: best.bank.id, bank: best.bank, rate: best.rate, deposit, loanAmount, termWeeks, weeklyPayment };
}

// Weighted pick among the feasible methods; returns 'cash' | 'finance' | 'lease' | null.
function pickWeightedMethod(personality, feasible) {
  const weights = AI_ACQ_WEIGHTS[personality] || AI_ACQ_WEIGHTS.balanced;
  const pool = [];
  let total = 0;
  for (const method of ['lease', 'cash', 'finance']) {
    if (feasible[method] && weights[method] > 0) { pool.push({ method, w: weights[method] }); total += weights[method]; }
  }
  if (pool.length === 0) return null;
  let roll = Math.random() * total;
  for (const p of pool) { roll -= p.w; if (roll <= 0) return p.method; }
  return pool[pool.length - 1].method;
}

// Decide how the AI pays for `purchasePrice`. Returns { method, leaseWeekly, financePlan }.
// method === null means "can't afford any method — skip this acquisition".
async function decideAIAcquisition(airline, purchasePrice, balance, hasRoutes, worldYear) {
  const maxPurchase = balance * (hasRoutes ? 0.4 : 0.7);
  const cashFeasible = purchasePrice <= maxPurchase;

  // Historical lease market curve (purchasePrice is already era-scaled; null pre-1970 = no leasing)
  const leaseWeekly = eraEconomicService.getWeeklyLeaseRate(purchasePrice, worldYear || 2010);
  const leaseFeasible = leaseWeekly !== null && balance >= leaseWeekly * 8;

  const activeLoans = await Loan.findAll({
    where: { worldMembershipId: airline.id, status: 'active' },
    attributes: ['bankId']
  });
  const existingLoanBankIds = new Set(activeLoans.map(l => l.bankId));
  // Owned-fleet value so AI net worth matches the player formula (leased = null, ignored by sum)
  const fleetValue = (await UserAircraft.sum('purchasePrice', {
    where: { worldMembershipId: airline.id }
  })) || 0;
  const financePlan = buildAIFinancePlan(airline, purchasePrice, balance, existingLoanBankIds, activeLoans.length, worldYear, fleetValue);

  const method = pickWeightedMethod(airline.aiPersonality, {
    cash: cashFeasible, lease: leaseFeasible, finance: !!financePlan
  });
  return { method, leaseWeekly, financePlan };
}

// Create the fleet-expansion Loan backing a financed AI purchase.
async function createAIFleetLoan(airline, financePlan, now) {
  return Loan.create({
    worldMembershipId: airline.id,
    bankId: financePlan.bankId,
    loanType: 'fleet_expansion',
    status: 'active',
    principalAmount: financePlan.loanAmount,
    remainingPrincipal: financePlan.loanAmount,
    interestRate: financePlan.rate,
    termWeeks: financePlan.termWeeks,
    weeksRemaining: financePlan.termWeeks,
    repaymentStrategy: 'fixed',
    weeklyPayment: financePlan.weeklyPayment,
    earlyRepaymentFee: financePlan.bank?.earlyRepaymentFee || 0,
    paymentHolidaysTotal: financePlan.bank?.paymentHolidays || 0,
    originationGameDate: now.toISOString().split('T')[0],
    creditScoreAtOrigin: aiCreditScore(airline)
  });
}

/**
 * Try to buy a new aircraft for the AI airline.
 * Considers: route needs (range/capacity), era popularity, fleet commonality, airport size.
 */
async function tryBuyAircraft(airline, world, config, currentFleet, worldYear, gameTime) {
  const balance = parseFloat(airline.balance) || 0;

  const availableAircraft = await Aircraft.findAll({
    where: { availableFrom: { [Op.lte]: worldYear } },
    order: [['passengerCapacity', 'ASC']]
  });

  const eraAircraft = availableAircraft.filter(ac => {
    if (!ac.availableUntil) return true;
    return ac.availableUntil >= worldYear;
  });

  if (eraAircraft.length === 0) return;

  // Filter by archetype: cargo airlines want cargo aircraft, others want pax
  const archetype = AIRLINE_ARCHETYPES[airline.airlineType] || AIRLINE_ARCHETYPES.fullService;
  let typeFiltered;
  if (archetype.transportType === 'cargo') {
    typeFiltered = eraAircraft.filter(ac => ac.type === 'Cargo' || ac.cargoCapacityKg > 10000);
    if (typeFiltered.length === 0) typeFiltered = eraAircraft.filter(ac => ac.cargoCapacityKg > 5000);
  } else {
    typeFiltered = eraAircraft.filter(ac => ac.passengerCapacity > 0 && ac.type !== 'Airship');  // airships handled separately in tryAcquireAirship
  }
  if (typeFiltered.length === 0) return;
  const paxAircraft = typeFiltered;

  // Budget: decide between purchase and lease
  const hasRoutes = await Route.count({ where: { worldMembershipId: airline.id, isActive: true } }) > 0;
  const maxPurchase = balance * (hasRoutes ? 0.4 : 0.7);

  // Lease affordability: can afford weekly payment = ~1% of aircraft value per week
  // AI can lease if it has at least 8 weeks of payments in balance
  const maxLeaseValue = balance / 0.01 / 8; // Can lease aircraft worth up to this

  const affordable = paxAircraft.filter(ac => {
    const price = parseFloat(ac.purchasePrice) || 50000000;
    return price <= maxPurchase || price <= maxLeaseValue;
  });

  if (affordable.length === 0) return;

  const baseAirport = airline.baseAirport || await Airport.findByPk(airline.baseAirportId);
  const maxPax = getMaxCapacityForAirport(baseAirport?.type);
  const sizeAppropriate = affordable.filter(ac => ac.passengerCapacity <= maxPax);
  const candidates = sizeAppropriate.length > 0 ? sizeAppropriate : affordable;

  // Determine what the airline needs based on archetype, routes, and opportunities
  const [prefMinPax, prefMaxPax] = archetype.preferredPaxRange || [50, 200];
  let targetRange = archetype.maxRouteDistance < 99999 ? Math.round(archetype.maxRouteDistance * 0.8) : 1500;
  let targetCapacity = Math.round((prefMinPax + prefMaxPax) / 2);
  const routes = await Route.findAll({
    where: { worldMembershipId: airline.id, isActive: true },
    attributes: ['distance', 'demand']
  });

  if (routes.length > 0) {
    // Buy for the average route profile
    const avgDistance = routes.reduce((s, r) => s + (parseFloat(r.distance) || 500), 0) / routes.length;
    const avgDemand = routes.reduce((s, r) => s + (parseInt(r.demand) || 50), 0) / routes.length;
    targetRange = Math.round(avgDistance * 1.3); // 30% headroom
    // Higher demand = bigger aircraft
    if (avgDemand > 60) targetCapacity = 250;
    else if (avgDemand > 40) targetCapacity = 180;
    else if (avgDemand > 25) targetCapacity = 120;
    else targetCapacity = 60;
  } else {
    // No routes yet — base on airport type
    if (baseAirport?.type === 'International Hub') { targetRange = 3000; targetCapacity = 180; }
    else if (baseAirport?.type === 'Major') { targetRange = 1500; targetCapacity = 120; }
    else { targetRange = 800; targetCapacity = 50; }
  }

  // Score each candidate: range fit + capacity fit + era popularity + fleet commonality
  const existingFamilies = new Set();
  for (const ac of currentFleet) {
    if (ac.aircraft) existingFamilies.add(`${ac.manufacturer} ${ac.model}`);
  }

  const scored = candidates.map(ac => {
    let score = 0;

    // Range fit: penalize aircraft that can't reach target, bonus for good match
    const range = ac.rangeNm || 1500;
    if (range < targetRange * 0.8) score -= 50; // Too short range
    else if (range > targetRange * 2.5) score -= 10; // Overkill range (paying for unused capability)
    else score += 20; // Good range match

    // Capacity fit: prefer aircraft near target capacity
    const capRatio = ac.passengerCapacity / targetCapacity;
    if (capRatio >= 0.5 && capRatio <= 1.5) score += 25; // Good fit
    else if (capRatio < 0.3) score -= 30; // Way too small
    else if (capRatio > 2.5) score -= 15; // Way too big

    // Era popularity: prefer aircraft introduced recently (within 15 years)
    // and penalize aircraft near end of life. This naturally selects era-appropriate types.
    const yearsInService = worldYear - ac.availableFrom;
    if (yearsInService <= 5) score += 15; // Brand new type — popular
    else if (yearsInService <= 15) score += 10; // Established, still popular
    else if (yearsInService <= 25) score += 0; // Aging but available
    else score -= 10; // Very old design

    // Penalize aircraft about to be discontinued (within 5 years of availableUntil)
    if (ac.availableUntil && ac.availableUntil - worldYear < 5) score -= 20;

    // Fleet commonality bonus
    if (existingFamilies.has(`${ac.manufacturer} ${ac.model}`)) score += 20;

    // Minimum viable size: penalize tiny aircraft (< 20 pax) unless at small airport
    if (ac.passengerCapacity < 20 && baseAirport?.type !== 'Small Regional') score -= 25;

    // Personality modifier
    if (airline.aiPersonality === 'aggressive') {
      score += ac.passengerCapacity > targetCapacity ? 5 : -5; // Prefers bigger
    } else if (airline.aiPersonality === 'conservative') {
      score += ac.passengerCapacity <= targetCapacity ? 5 : -5; // Prefers right-sized or smaller
    }

    return { aircraft: ac, score };
  });

  // Sort by score descending, pick from top candidates with some randomness
  scored.sort((a, b) => b.score - a.score);
  const topN = scored.slice(0, Math.min(5, scored.length));
  const chosen = topN[Math.floor(Math.random() * topN.length)].aircraft;

  const rawPrice = parseFloat(chosen.purchasePrice) || 50000000;
  const purchasePrice = Math.round(rawPrice * eraEconomicService.getEraMultiplier(worldYear));

  // Decide how to pay: cash outright / finance (deposit + bank loan) / lease.
  // Weighted by personality and constrained by what the airline can afford.
  const { method, leaseWeekly, financePlan } = await decideAIAcquisition(airline, purchasePrice, balance, hasRoutes, worldYear);
  if (!method) return; // can't sensibly afford any acquisition method right now
  const leaseWeeklyPayment = leaseWeekly;
  const leaseDurationMonths = 36;

  // Generate registration
  const existingRegs = new Set(currentFleet.map(ac => ac.registration));
  const prefixes = {
    'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-',
    'Japan': 'JA-', 'Australia': 'VH-', 'Canada': 'C-', 'Brazil': 'PT-'
  };
  const prefix = prefixes[airline.region] || 'XX-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let reg;
  for (let i = 0; i < 100; i++) {
    reg = prefix;
    const suffLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
    for (let j = 0; j < suffLen; j++) {
      reg += chars[Math.floor(Math.random() * 26)];
    }
    if (!existingRegs.has(reg)) break;
  }

  try {
    const now = new Date(gameTime || new Date());

    // Common maintenance/scheduling defaults for a newly acquired aircraft.
    const baseFields = {
      worldMembershipId: airline.id,
      aircraftId: chosen.id,
      registration: reg,
      totalFlightHours: 0,
      status: 'active',
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: now,
      lastWeeklyCheckDate: now,
      lastACheckDate: now,
      lastACheckHours: 0,
      lastCCheckDate: now,
      lastDCheckDate: now
    };

    let acqType, acqDetail;

    if (method === 'lease') {
      const leaseEnd = new Date(now);
      leaseEnd.setMonth(leaseEnd.getMonth() + leaseDurationMonths);
      await UserAircraft.create({
        ...baseFields,
        acquisitionType: 'lease',
        purchasePrice: null,
        leaseWeeklyPayment,
        leaseDurationMonths,
        leaseStartDate: now,
        leaseEndDate: leaseEnd
      });
      airline.balance = parseFloat(airline.balance) - leaseWeeklyPayment; // first week
      await airline.save();
      acqType = 'leased';
      acqDetail = `$${Math.round(leaseWeeklyPayment).toLocaleString()}/week`;
      aiLog(`[AI-DECISION] ${airline.airlineName} leased ${chosen.manufacturer} ${chosen.model} (${reg}) for $${Math.round(leaseWeeklyPayment).toLocaleString()}/week`);

    } else if (method === 'finance') {
      await UserAircraft.create({ ...baseFields, acquisitionType: 'purchase', purchasePrice });
      await createAIFleetLoan(airline, financePlan, now);
      airline.balance = parseFloat(airline.balance) - financePlan.deposit; // deposit only; loan covers the rest
      await airline.save();
      acqType = 'financed';
      acqDetail = `$${(purchasePrice / 1000000).toFixed(1)}M ($${(financePlan.deposit / 1000000).toFixed(1)}M down, $${Math.round(financePlan.loanAmount).toLocaleString()} loan via ${financePlan.bank.shortName})`;
      aiLog(`[AI-DECISION] ${airline.airlineName} financed ${chosen.manufacturer} ${chosen.model} (${reg}): $${(financePlan.deposit / 1000000).toFixed(1)}M down + $${Math.round(financePlan.loanAmount).toLocaleString()} loan @ ${financePlan.rate}% (${financePlan.bank.shortName}), $${Math.round(financePlan.weeklyPayment).toLocaleString()}/wk`);

    } else { // cash
      await UserAircraft.create({ ...baseFields, acquisitionType: 'purchase', purchasePrice });
      airline.balance = parseFloat(airline.balance) - purchasePrice;
      await airline.save();
      acqType = 'purchased';
      acqDetail = `$${(purchasePrice / 1000000).toFixed(1)}M cash`;
      aiLog(`[AI-DECISION] ${airline.airlineName} purchased ${chosen.manufacturer} ${chosen.model} (${reg}) for $${(purchasePrice / 1000000).toFixed(1)}M`);
    }

    await notifyPlayer(world.id,
      `${airline.airlineName} Acquired Aircraft`,
      `${airline.airlineName} ${acqType} a ${chosen.manufacturer} ${chosen.model}${chosen.variant ? ' ' + chosen.variant : ''} (${reg}) for ${acqDetail}.`,
      gameTime,
      { type: 'operations', icon: 'plane', priority: 5, link: '/competition' }
    );
  } catch (err) {
    console.error(`[AI-DECISION] ${airline.airlineName} failed to buy aircraft: ${err.message}`);
  }
}

/**
 * Contract the network by cancelling the least profitable route
 */
async function tryContractNetwork(airline, routes, config, world, gameTime, options = {}) {
  // Patience gates: don't cut routes too early or that aren't genuinely failing.
  //   - MIN_FLIGHTS: a route must have flown enough to have matured (LF ramps over
  //     ~8-12 game-weeks) before its numbers are judged.
  //   - CANCEL_RATIO: only cancel a route covering less than this share of its costs;
  //     a marginal or still-ramping route is left alone.
  //   - force (bankruptcy only): drop the guards so a desperate airline can shed its
  //     worst route to survive.
  const force = options.force === true;
  const MIN_FLIGHTS = force ? 3 : 8;
  const CANCEL_RATIO = force ? Infinity : 0.80;

  // Find worst-performing route (by revenue/cost ratio, not absolute profit)
  let worstRoute = null;
  let worstRatio = Infinity;

  for (const route of routes) {
    const flights = parseInt(route.totalFlights) || 0;
    if (flights < MIN_FLIGHTS) continue; // Give new routes time to mature
    const revenue = parseFloat(route.totalRevenue) || 0;
    const costs = parseFloat(route.totalCosts) || 0;
    const ratio = costs > 0 ? revenue / costs : 1;
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worstRoute = route;
    }
  }

  // Nothing eligible, or the worst route is still healthy enough to keep running.
  if (!worstRoute || worstRatio >= CANCEL_RATIO) return;

  try {
    worstRoute.isActive = false;
    await worstRoute.save();

    await ScheduledFlight.destroy({
      where: { routeId: worstRoute.id }
    });

    aiLog(`[AI-DECISION] ${airline.airlineName} cancelled route ${worstRoute.routeNumber} (rev/cost ratio: ${worstRatio.toFixed(2)})`);

    if (world && gameTime) {
      const depCode = worstRoute.departureAirport?.icaoCode || '???';
      const arrCode = worstRoute.arrivalAirport?.icaoCode || '???';
      await notifyPlayer(world.id,
        `${airline.airlineName} Cancelled Route`,
        `${airline.airlineName} has cancelled their ${depCode}-${arrCode} route due to poor performance.`,
        gameTime,
        { type: 'operations', icon: 'route', priority: 5, link: '/competition' }
      );
    }
  } catch (err) {
    console.error(`[AI-DECISION] Failed to cancel route for ${airline.airlineName}: ${err.message}`);
  }
}

/**
 * Competition-aware pricing.
 * Considers monopoly/competition status, load factor, cost floor, and price smoothing.
 * Processes up to 5 routes per decision cycle.
 */
async function adjustPricing(airline, routes, config, worldYear, world, gameTime) {
  // Shuffle and pick up to 5 routes to review
  const routesToReview = [...routes].sort(() => Math.random() - 0.5).slice(0, 5);

  for (const route of routesToReview) {
    const distance = parseFloat(route.distance) || 500;
    const loadFactor = parseFloat(route.averageLoadFactor) || 0.7;
    const marketPrice = eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy');

    // Get aircraft capacity for cost floor
    let paxCapacity = 150;
    if (route.assignedAircraftId) {
      const ac = await UserAircraft.findByPk(route.assignedAircraftId, {
        include: [{ model: Aircraft, as: 'aircraft' }]
      });
      if (ac?.aircraft) paxCapacity = ac.aircraft.passengerCapacity || 150;
    }

    const costFloor = calculateOperatingCostPerPax(distance, paxCapacity, worldYear);
    const competitors = await countCompetitors(route);

    // Step 1: Base price from competition level
    let targetPrice;
    if (competitors === 0) {
      // Monopoly — charge premium
      targetPrice = Math.round(marketPrice * (config.monopolyPriceMultiplier || 1.10));
    } else if (competitors <= 2) {
      // Light competition — market rate with personality
      targetPrice = Math.round(marketPrice * config.pricingModifier);
    } else {
      // Heavy competition (3+) — personality-driven
      if (airline.aiPersonality === 'aggressive') {
        targetPrice = Math.round(marketPrice * 0.93);
      } else if (airline.aiPersonality === 'conservative') {
        targetPrice = Math.round(marketPrice * 1.05);
      } else {
        targetPrice = Math.round(marketPrice * config.pricingModifier);
      }
    }

    // Step 2: Load factor adjustment
    if (loadFactor > 0.85) {
      targetPrice = Math.round(targetPrice * (1.0 + (loadFactor - 0.85) * 0.5)); // up to +7.5%
    } else if (loadFactor < 0.50) {
      targetPrice = Math.round(targetPrice * (0.90 + loadFactor * 0.2)); // -10% at 0 LF
    }

    // Step 3: Enforce floors (never below operating cost or config minimum)
    const configFloor = Math.round(marketPrice * (config.priceFloor || 0.85));
    targetPrice = Math.max(targetPrice, costFloor, configFloor);

    // Step 4: Smooth changes (max 15% shift per cycle)
    const oldPrice = parseFloat(route.economyPrice) || targetPrice;
    const maxChange = oldPrice * 0.15;
    if (Math.abs(targetPrice - oldPrice) > maxChange) {
      targetPrice = targetPrice > oldPrice
        ? Math.round(oldPrice + maxChange)
        : Math.round(oldPrice - maxChange);
    }

    // Skip if price barely changed
    if (Math.abs(targetPrice - oldPrice) < 2) continue;

    try {
      await route.update({
        economyPrice: targetPrice,
        economyPlusPrice: Math.round(targetPrice * 1.3),
        businessPrice: Math.round(targetPrice * 2.5),
        firstPrice: Math.round(targetPrice * 4)
      });

      // Notify player on undercut
      if (world && gameTime && targetPrice < oldPrice) {
        const playerRoute = await Route.findOne({
          where: {
            isActive: true,
            worldMembershipId: { [Op.ne]: airline.id },
            [Op.or]: [
              { departureAirportId: route.departureAirportId, arrivalAirportId: route.arrivalAirportId },
              { departureAirportId: route.arrivalAirportId, arrivalAirportId: route.departureAirportId }
            ]
          },
          include: [{ model: WorldMembership, as: 'membership', where: { isAI: false } }]
        });

        if (playerRoute && targetPrice < parseFloat(playerRoute.economyPrice)) {
          const depAp = await Airport.findByPk(route.departureAirportId, { attributes: ['icaoCode'] });
          const arrAp = await Airport.findByPk(route.arrivalAirportId, { attributes: ['icaoCode'] });
          await notifyPlayer(world.id,
            `Price Undercut: ${depAp?.icaoCode || '???'}-${arrAp?.icaoCode || '???'}`,
            `${airline.airlineName} lowered their economy fares on ${depAp?.icaoCode || '???'}-${arrAp?.icaoCode || '???'} to $${targetPrice} (your price: $${Math.round(parseFloat(playerRoute.economyPrice))}).`,
            gameTime,
            { type: 'finance', icon: 'dollar', priority: 3, link: '/competition' }
          );
        }
      }
    } catch (err) {
      // Pricing update failed, not critical
    }
  }
}

/**
 * Check if the player has entered any of the AI's routes and respond.
 * Response varies by personality: conservative holds, balanced matches, aggressive undercuts.
 * Only triggers when AI route load factor has dropped or player route is recent.
 */
async function checkCompetitiveResponse(airline, routes, config, world, gameTime, worldYear) {
  for (const route of routes) {
    // Find player routes competing with this AI route
    const playerRoutes = await Route.findAll({
      where: {
        [Op.or]: [
          { departureAirportId: route.departureAirportId, arrivalAirportId: route.arrivalAirportId },
          { departureAirportId: route.arrivalAirportId, arrivalAirportId: route.departureAirportId }
        ],
        isActive: true,
        worldMembershipId: { [Op.ne]: airline.id }
      },
      include: [{ model: WorldMembership, as: 'membership', where: { isAI: false } }]
    });

    if (playerRoutes.length === 0) continue;

    // Only respond if our load factor has dropped or player route is recent
    const loadFactor = parseFloat(route.averageLoadFactor) || 0.7;
    const playerRouteAge = Math.min(
      ...playerRoutes.map(r => gameTime.getTime() - new Date(r.createdAt).getTime())
    );
    const thirtyGameDays = 30 * 24 * 60 * 60 * 1000;
    const needsResponse = loadFactor < 0.60 || playerRouteAge < thirtyGameDays;
    if (!needsResponse) continue;

    // Personality-modified response chance
    let responseChance = config.competitiveResponseChance;
    if (airline.aiPersonality === 'aggressive') responseChance = Math.min(1.0, responseChance * 1.5);
    if (airline.aiPersonality === 'conservative') responseChance *= 0.5;

    if (Math.random() > responseChance) continue;

    const cheapestPlayerPrice = Math.min(
      ...playerRoutes.map(r => parseFloat(r.economyPrice) || Infinity)
    );
    const myPrice = parseFloat(route.economyPrice) || 0;
    const distance = parseFloat(route.distance) || 500;
    const marketPrice = eraEconomicService.calculateTicketPrice(distance, worldYear, 'economy');
    const costFloor = calculateOperatingCostPerPax(distance, 150, worldYear);
    const configFloor = Math.round(marketPrice * (config.priceFloor || 0.85));
    const absoluteFloor = Math.max(costFloor, configFloor);

    let newPrice = myPrice;

    if (airline.aiPersonality === 'aggressive') {
      // Undercut player by 5%, but respect floor
      newPrice = Math.round(cheapestPlayerPrice * 0.95);
    } else if (airline.aiPersonality === 'conservative') {
      // Don't price war — only adjust if significantly overpriced vs market
      if (myPrice > marketPrice * 1.15) {
        newPrice = Math.round(marketPrice * 1.02); // Slight premium, stop bleeding
      } else {
        continue; // Conservative holds price
      }
    } else {
      // Balanced — match player price
      newPrice = Math.round(cheapestPlayerPrice);
    }

    // Enforce floor
    newPrice = Math.max(newPrice, absoluteFloor);

    // Enforce max drop per cycle
    const maxDrop = Math.round(myPrice * (config.maxPriceDropPerCycle || 0.10));
    if (myPrice - newPrice > maxDrop) {
      newPrice = myPrice - maxDrop;
    }

    // Only apply if actually changing
    if (newPrice >= myPrice) continue;

    try {
      await route.update({
        economyPrice: newPrice,
        economyPlusPrice: Math.round(newPrice * 1.3),
        businessPrice: Math.round(newPrice * 2.5),
        firstPrice: Math.round(newPrice * 4)
      });

      const depCode = route.departureAirport?.icaoCode || '???';
      const arrCode = route.arrivalAirport?.icaoCode || '???';
      const action = airline.aiPersonality === 'aggressive' ? 'undercut your fares' : 'adjusted fares';
      await notifyPlayer(world.id,
        `Competitive Response: ${depCode}-${arrCode}`,
        `${airline.airlineName} has ${action} on ${depCode}-${arrCode} to $${newPrice} (was $${Math.round(myPrice)}).`,
        gameTime,
        { type: 'finance', icon: 'dollar', priority: 3, link: '/competition' }
      );
    } catch (err) {
      // Non-critical
    }
  }
}

// ─── Fleet upgrades ──────────────────────────────────────────────────

/**
 * Try to upgrade obsolete aircraft in the fleet.
 * Triggers when an aircraft type is near end of availability or very old.
 * Process: buy/lease replacement first, then dispose of old aircraft.
 */
async function tryUpgradeFleet(airline, world, config, fleet, routes, worldYear, gameTime) {
  // Find aircraft that need upgrading
  for (const ua of fleet) {
    const acType = ua.aircraft;
    if (!acType) continue;

    const yearsUntilEnd = acType.availableUntil ? acType.availableUntil - worldYear : 999;
    const acAge = parseFloat(ua.ageYears) || 0;

    // Upgrade triggers:
    // - Aircraft type discontinued within 3 years
    // - Aircraft is very old (25+ years) and newer alternatives exist
    const needsUpgrade = yearsUntilEnd <= 3 || (acAge >= 25 && yearsUntilEnd < 20);
    if (!needsUpgrade) continue;

    // Check if this aircraft has routes — need to find a suitable replacement
    const acRoutes = routes.filter(r => r.assignedAircraftId === ua.id);
    const maxRouteDistance = acRoutes.length > 0
      ? Math.max(...acRoutes.map(r => parseFloat(r.distance) || 500))
      : (acType.rangeNm || 1500) * 0.7;

    // Find replacement candidates
    const archetype = AIRLINE_ARCHETYPES[airline.airlineType] || AIRLINE_ARCHETYPES.fullService;
    const replacements = await Aircraft.findAll({
      where: {
        availableFrom: { [Op.lte]: worldYear },
        passengerCapacity: { [Op.gt]: 0 },
        type: { [Op.ne]: 'Airship' }
      },
      order: [['passengerCapacity', 'ASC']]
    });

    const viable = replacements.filter(ac => {
      if (ac.availableUntil && ac.availableUntil < worldYear) return false;
      if (ac.availableUntil && ac.availableUntil - worldYear < 10) return false; // Don't buy something also about to retire
      if ((ac.rangeNm || 0) < maxRouteDistance * 0.95) return false; // Must cover existing routes
      if (ac.id === acType.id) return false; // Not the same type
      // Match archetype size preferences
      const [minPax, maxPax] = archetype.preferredPaxRange || [0, 999];
      if (archetype.transportType !== 'cargo' && (ac.passengerCapacity < minPax * 0.5 || ac.passengerCapacity > maxPax * 2)) return false;
      return true;
    });

    if (viable.length === 0) continue;

    // Score replacements (prefer similar capacity, newer, affordable)
    const balance = parseFloat(airline.balance) || 0;
    const scored = viable.map(ac => {
      let score = 0;
      const capDiff = Math.abs(ac.passengerCapacity - acType.passengerCapacity);
      score -= capDiff * 0.1; // Prefer similar size
      const yearsNew = worldYear - ac.availableFrom;
      if (yearsNew <= 5) score += 10; // Brand new type
      else if (yearsNew <= 15) score += 5;
      const price = Math.round((parseFloat(ac.purchasePrice) || 50000000) * eraEconomicService.getEraMultiplier(worldYear));
      if (price <= balance * 0.4) score += 5; // Can afford to buy
      return { aircraft: ac, score, price };
    });

    scored.sort((a, b) => b.score - a.score);
    const replacement = scored[0];
    if (!replacement) continue;

    // Decide how to pay for the replacement: cash / finance / lease (a renewing
    // airline has routes, so use the with-routes cash budget).
    const { method, leaseWeekly, financePlan } = await decideAIAcquisition(airline, replacement.price, balance, true, worldYear);
    if (!method) continue;

    // Acquire replacement (reuse tryBuyAircraft logic is complex, do inline)
    const prefix = { 'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-' }[airline.region] || 'XX-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let reg = prefix;
    const suffLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
    for (let j = 0; j < suffLen; j++) reg += chars[Math.floor(Math.random() * 26)];

    const now = new Date(gameTime);
    try {
      const baseFields = {
        worldMembershipId: airline.id,
        aircraftId: replacement.aircraft.id,
        registration: reg,
        status: 'active',
        totalFlightHours: 0,
        autoScheduleDaily: true, autoScheduleWeekly: true,
        lastDailyCheckDate: now, lastWeeklyCheckDate: now,
        lastACheckDate: now, lastACheckHours: 0,
        lastCCheckDate: now, lastDCheckDate: now
      };
      if (method === 'lease') {
        const leaseEnd = new Date(now);
        leaseEnd.setMonth(leaseEnd.getMonth() + 36);
        await UserAircraft.create({
          ...baseFields,
          acquisitionType: 'lease',
          leaseWeeklyPayment: leaseWeekly,
          leaseDurationMonths: 36,
          leaseStartDate: now, leaseEndDate: leaseEnd
        });
        airline.balance = balance - leaseWeekly;
        await airline.save();
      } else if (method === 'finance') {
        await UserAircraft.create({ ...baseFields, acquisitionType: 'purchase', purchasePrice: replacement.price });
        await createAIFleetLoan(airline, financePlan, now);
        airline.balance = balance - financePlan.deposit;
        await airline.save();
      } else { // cash
        await UserAircraft.create({ ...baseFields, acquisitionType: 'purchase', purchasePrice: replacement.price });
        airline.balance = balance - replacement.price;
        await airline.save();
      }

      // Reassign routes from old aircraft to new one
      // (The new aircraft ID will be the most recently created one)
      const newAc = await UserAircraft.findOne({
        where: { worldMembershipId: airline.id, registration: reg },
        attributes: ['id']
      });
      if (newAc && acRoutes.length > 0) {
        for (const route of acRoutes) {
          await route.update({ assignedAircraftId: newAc.id });
          // Update scheduled flights
          await ScheduledFlight.update(
            { aircraftId: newAc.id },
            { where: { routeId: route.id, aircraftId: ua.id } }
          );
        }
      }

      // Dispose of old aircraft — scrap if very old, sell if decent
      const condition = parseFloat(ua.conditionPercentage) || 50;
      if (acAge >= 20 || condition < 40) {
        // Scrap — instant removal for AI (no ferry delay)
        const scrapValue = Math.round((parseFloat(acType.purchasePrice) || 10000000) * 0.15 * (condition / 100));
        airline.balance = (parseFloat(airline.balance) || 0) + scrapValue;
        await airline.save();
        await ScheduledFlight.destroy({ where: { aircraftId: ua.id } });
        await RecurringMaintenance.destroy({ where: { aircraftId: ua.id } });
        await ua.destroy();
        aiLog(`[AI-DECISION] ${airline.airlineName} scrapped ${acType.manufacturer} ${acType.model} (${ua.registration}), got $${Math.round(scrapValue).toLocaleString()}`);
      } else {
        // List for sale at the average used-market price for this type, adjusted
        // for this specific aircraft's wear: a better-than-average unit lists above
        // the type average, a worn one below it. Anchored on the type average so it
        // stays consistent with other aircraft of the same type (not a flat % of new).
        const typeAvg = estimateTypeAverageSalePrice(acType, worldYear);
        let salePrice;
        if (typeAvg) {
          // Scale by condition relative to the sampled fleet's average condition,
          // clamped so extremes stay sensible.
          const wearRatio = Math.max(0.4, Math.min(1.5, condition / typeAvg.refCondition));
          salePrice = Math.round(typeAvg.avg * wearRatio);
        } else {
          salePrice = Math.round((parseFloat(acType.purchasePrice) || 10000000) * 0.5 * (condition / 100));
        }
        await ua.update({ status: 'listed_sale', listingPrice: salePrice, listedAt: now });
        aiLog(`[AI-DECISION] ${airline.airlineName} listed ${acType.manufacturer} ${acType.model} (${ua.registration}) for sale at $${Math.round(salePrice).toLocaleString()}`);
      }

      const acqLabel = method === 'lease' ? 'leased' : method === 'finance' ? 'financed' : 'purchased';
      aiLog(`[AI-DECISION] ${airline.airlineName} upgraded: ${acType.manufacturer} ${acType.model} → ${replacement.aircraft.manufacturer} ${replacement.aircraft.model} (${acqLabel})`);

      await notifyPlayer(world.id,
        `${airline.airlineName} Fleet Upgrade`,
        `${airline.airlineName} replaced their ${acType.manufacturer} ${acType.model} with a ${replacement.aircraft.manufacturer} ${replacement.aircraft.model} (${reg}).`,
        gameTime,
        { type: 'operations', icon: 'plane', priority: 4, link: '/competition' }
      );

      break; // Only upgrade one aircraft per cycle
    } catch (err) {
      console.error(`[AI-DECISION] ${airline.airlineName} upgrade failed: ${err.message}`);
    }
  }
}

// ─── Replacement spawning ────────────────────────────────────────────

/**
 * Schedule a replacement AI airline to spawn after a delay.
 * Only on Medium/Hard difficulty when an AI goes bankrupt.
 */
function scheduleReplacementSpawn(world, config, gameTime) {
  const delayGameDays = 30 + Math.floor(Math.random() * 60);
  const delayMs = (delayGameDays * 24 * 60 * 60 * 1000) / (world.timeAcceleration || 60);
  const cappedDelay = Math.min(delayMs, 10 * 60 * 1000);

  console.log(`[AI-SPAWN] Scheduling replacement AI in ${Math.round(cappedDelay / 1000)}s (${delayGameDays} game days)`);

  setTimeout(async () => {
    try {
      const World = require('../models/World');
      const freshWorld = await World.findByPk(world.id);
      if (!freshWorld || freshWorld.status !== 'active') return;

      const currentAI = await WorldMembership.count({
        where: { worldId: world.id, isAI: true, isActive: true }
      });

      const player = await WorldMembership.findOne({
        where: { worldId: world.id, isAI: false, isActive: true },
        include: [{ model: Airport, as: 'baseAirport' }]
      });
      if (!player || !player.baseAirport) return;

      const { getAICount } = require('../data/aiDifficultyConfig');
      const targetCount = getAICount(freshWorld.difficulty);
      if (currentAI >= targetCount) return;

      const spawnResult = await spawnOneAIAirline(freshWorld, freshWorld.difficulty, player.baseAirport);

      const worldTimeService = require('./worldTimeService');
      const currentGameTime = worldTimeService.getCurrentTime(world.id) || new Date();

      const aiName = spawnResult?.airlineName || 'A new airline';
      const aiBase = spawnResult?.baseAirport;
      const baseInfo = aiBase ? ` based at ${aiBase.icaoCode} (${aiBase.city || aiBase.name})` : '';
      const isAtPlayerBase = aiBase && player.baseAirport && aiBase.id === player.baseAirport.id;
      const label = isAtPlayerBase ? 'New Competitor' : 'New Airline';

      await notifyPlayer(world.id,
        `${label}: ${aiName}`,
        `${aiName} has entered the market${baseInfo} and will begin operations soon.`,
        currentGameTime,
        { type: 'operations', icon: 'plane', priority: isAtPlayerBase ? 2 : 3, link: '/competition' }
      );

      console.log(`[AI-SPAWN] Replacement AI airline spawned in world ${world.id}`);
    } catch (err) {
      console.error('[AI-SPAWN] Failed to spawn replacement AI:', err.message);
    }
  }, cappedDelay);
}

/**
 * Spawn a single replacement AI airline
 */
async function spawnOneAIAirline(world, difficulty, humanBaseAirport) {
  const { generateAIAirline } = require('../data/aiAirlineNames');
  const { AI_DIFFICULTY } = require('../data/aiDifficultyConfig');
  const config = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.medium;

  const worldYear = new Date(world.startDate).getFullYear();
  const humanRegion = getRegionFromCountry(humanBaseAirport.country);

  const existingMembers = await WorldMembership.findAll({
    where: { worldId: world.id },
    attributes: ['airlineCode', 'iataCode', 'airlineName']
  });
  const existingICAO = new Set(existingMembers.map(m => m.airlineCode).filter(Boolean));
  const existingIATA = new Set(existingMembers.map(m => m.iataCode).filter(Boolean));
  const existingNames = new Set(existingMembers.map(m => m.airlineName).filter(Boolean));

  const airports = await Airport.findAll({
    where: {
      id: { [Op.ne]: humanBaseAirport.id },
      type: { [Op.in]: ['International Hub', 'Major', 'Regional'] }
    },
    order: [['traffic_demand', 'DESC']],
    limit: 50
  });

  if (airports.length === 0) return;

  const scored = airports.map(ap => {
    const sameRegion = getRegionFromCountry(ap.country) === humanRegion;
    let score = (ap.trafficDemand || 10) * (0.7 + Math.random() * 0.6);
    if (config.competitorProximity === 'close') score *= sameRegion ? 3 : 1;
    else if (config.competitorProximity === 'far') score *= sameRegion ? 0.5 : 2;
    else score *= sameRegion ? 1.5 : 1;
    return { airport: ap, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const baseAirport = scored[0].airport;

  const aiRegion = getRegionFromCountry(baseAirport.country);
  const personality = pickPersonality(difficulty);
  const airline = generateAIAirline(aiRegion, worldYear, existingICAO, existingIATA, existingNames, baseAirport.country);
  if (!airline.icaoCode || !airline.iataCode) return;

  const startingBalance = eraEconomicService.getStartingCapital(worldYear) * config.startingBalanceMultiplier;

  const membership = await WorldMembership.create({
    userId: null,
    worldId: world.id,
    airlineName: airline.name,
    airlineCode: airline.icaoCode,
    iataCode: airline.iataCode,
    region: baseAirport.country,
    baseAirportId: baseAirport.id,
    balance: startingBalance,
    reputation: 40 + Math.floor(Math.random() * 10),
    isAI: true,
    airlineType: pickArchetype(worldYear),
    aiPersonality: personality,
    aiLastDecisionTime: new Date(),
    cleaningContractor: pickAIContractorTier(),
    groundContractor: pickAIContractorTier(),
    engineeringContractor: pickAIContractorTier()
  });

  console.log(`[AI-SPAWN] Replacement: ${airline.name} (${airline.icaoCode}) at ${baseAirport.icaoCode} [${personality}]`);

  const availableAircraft = await Aircraft.findAll({
    where: { availableFrom: { [Op.lte]: worldYear } },
    order: [['passengerCapacity', 'ASC']]
  });
  const eraAircraft = availableAircraft.filter(ac => !ac.availableUntil || ac.availableUntil >= worldYear);

  if (eraAircraft.length > 0) {
    const { assignInitialFleet } = require('./aiSpawningService');
    if (typeof assignInitialFleet === 'function') {
      await assignInitialFleet(membership, baseAirport, eraAircraft, config, new Set());
    }
  }

  return { airlineName: airline.name, baseAirport };
}

/**
 * Map country to region
 */
function getRegionFromCountry(country) {
  const regionMap = {
    'United Kingdom': 'Europe', 'France': 'Europe', 'Germany': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Netherlands': 'Europe', 'Switzerland': 'Europe', 'Sweden': 'Europe',
    'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe', 'Ireland': 'Europe',
    'Portugal': 'Europe', 'Greece': 'Europe', 'Poland': 'Europe', 'Turkey': 'Europe',
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    'China': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
    'Singapore': 'Asia', 'Thailand': 'Asia', 'Malaysia': 'Asia', 'Indonesia': 'Asia',
    'United Arab Emirates': 'Middle East', 'Saudi Arabia': 'Middle East', 'Qatar': 'Middle East',
    'South Africa': 'Africa', 'Egypt': 'Africa', 'Kenya': 'Africa', 'Nigeria': 'Africa',
    'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America',
    'Australia': 'Oceania', 'New Zealand': 'Oceania'
  };
  return regionMap[country] || 'Europe';
}

// ── Airship acquisition + sightseeing tour ──────────────────────────────

/**
 * Occasionally acquire a single airship and immediately create a sightseeing
 * tour for it. Only called for aggressive/balanced personalities with ≥3
 * aircraft and no existing airship. The tour uses a teardrop waypoint pattern
 * generated from the base airport's coordinates.
 */
async function tryAcquireAirship(airline, world, worldYear, gameTime, currentFleet) {
  try {
    const airships = await Aircraft.findAll({
      where: { type: 'Airship', availableFrom: { [Op.lte]: worldYear } }
    });
    const eraAirships = airships.filter(a => !a.availableUntil || a.availableUntil >= worldYear);
    if (eraAirships.length === 0) return;

    const chosen = eraAirships[Math.floor(Math.random() * eraAirships.length)];
    const price = parseFloat(chosen.purchasePrice) || 500000;
    const balance = parseFloat(airline.balance) || 0;

    // Airships are cheap but still need affordability check (max 10% of balance)
    if (price > balance * 0.10) return;

    // Generate registration
    const existingRegs = new Set(currentFleet.map(ac => ac.registration));
    const prefixes = {
      'United Kingdom': 'G-', 'United States': 'N', 'France': 'F-', 'Germany': 'D-',
      'Japan': 'JA-', 'Australia': 'VH-', 'Canada': 'C-', 'Brazil': 'PT-'
    };
    const prefix = prefixes[airline.region] || 'XX-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let reg = prefix;
    for (let attempt = 0; attempt < 100; attempt++) {
      reg = prefix;
      const suffLen = prefix.endsWith('-') ? 4 : (prefix.length === 1 ? 5 : 4);
      for (let j = 0; j < suffLen; j++) reg += chars[Math.floor(Math.random() * 26)];
      if (!existingRegs.has(reg)) break;
    }

    const now = new Date(gameTime || new Date());
    const ua = await UserAircraft.create({
      worldMembershipId: airline.id,
      aircraftId: chosen.id,
      registration: reg,
      totalFlightHours: 0,
      status: 'active',
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: now,
      lastWeeklyCheckDate: now,
      lastACheckDate: now,
      lastACheckHours: 0,
      lastCCheckDate: now,
      lastDCheckDate: now,
      acquisitionType: 'purchase',
      purchasePrice: price
    });

    airline.balance = balance - price;
    await airline.save();

    aiLog(`[AI-DECISION] ${airline.airlineName} purchased airship ${chosen.manufacturer} ${chosen.model} (${reg}) for sightseeing tours`);

    // Create a sightseeing tour for the airship
    await createAISightseeingTour(airline, ua, chosen, world, worldYear);
  } catch (err) {
    console.error(`[AI-DECISION] Airship acquisition error for ${airline.airlineName}:`, err.message);
  }
}

/**
 * Generate a scenic teardrop loop from the airline's base airport and create
 * a SightseeingTour. Waypoints are placed in a teardrop pattern: fly out on
 * a heading, sweep around, and return. Distance stays within the airship's
 * range (typically 50-120nm round trip).
 */
async function createAISightseeingTour(airline, userAircraft, aircraftType, world, worldYear) {
  try {
    const { SightseeingTour } = require('../models');
    const baseAirport = airline.baseAirport || await Airport.findByPk(airline.baseAirportId);
    if (!baseAirport) return;

    const baseLat = parseFloat(baseAirport.latitude) || 0;
    const baseLng = parseFloat(baseAirport.longitude) || 0;
    const range = Math.min(aircraftType.rangeNm || 250, 200); // cap loop at 200nm
    const loopRadius = Math.max(15, range * 0.15); // ~15-30nm from base

    // Teardrop pattern: pick a random outbound heading, place 4 waypoints
    // in a teardrop shape (out, sweep right, far point, sweep back).
    const heading = Math.random() * 360; // random outbound direction
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;

    // Offset a point by distance (nm) and bearing from lat/lng
    const offsetPoint = (lat, lng, distNm, bearingDeg) => {
      const R = 3440.065; // earth radius in nm
      const d = distNm / R;
      const brng = toRad(bearingDeg);
      const lat1 = toRad(lat);
      const lng1 = toRad(lng);
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
      const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
      return { lat: +toDeg(lat2).toFixed(4), lng: +toDeg(lng2).toFixed(4) };
    };

    const wp1 = offsetPoint(baseLat, baseLng, loopRadius * 0.6, heading);          // out
    const wp2 = offsetPoint(baseLat, baseLng, loopRadius,       heading + 30);      // sweep right
    const wp3 = offsetPoint(baseLat, baseLng, loopRadius * 1.2, heading + 90);      // far point (apex)
    const wp4 = offsetPoint(baseLat, baseLng, loopRadius * 0.8, heading + 150);     // sweep back

    // Name the waypoints generically
    const cityName = baseAirport.city || baseAirport.name || 'Local';
    const waypoints = [
      { ...wp1, name: `${cityName} Outskirts` },
      { ...wp2, name: 'Scenic Overlook' },
      { ...wp3, name: 'Vista Point' },
      { ...wp4, name: 'Return Leg' }
    ];

    // Compute total distance: base → wp1 → wp2 → wp3 → wp4 → base
    const haversineNm = (lat1, lng1, lat2, lng2) => {
      const R = 3440.065;
      const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const pts = [{ lat: baseLat, lng: baseLng }, ...waypoints, { lat: baseLat, lng: baseLng }];
    let distanceNm = 0;
    for (let i = 1; i < pts.length; i++) {
      distanceNm += haversineNm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
    }
    distanceNm = Math.round(distanceNm * 100) / 100;

    const cruiseSpeed = aircraftType.cruiseSpeed || 50;
    const durationMin = Math.max(15, Math.round(distanceNm / cruiseSpeed * 60));

    // Era-scaled ticket price: ~$3/scenic-min × eraMultiplier
    const eraMult = eraEconomicService.getEraMultiplier(worldYear);
    const ticketPrice = Math.round(durationMin * 3 * eraMult * (0.85 + Math.random() * 0.30));

    // Departure time: morning scenic flight (08:00-11:00)
    const depHour = 8 + Math.floor(Math.random() * 3);
    const scheduledDepartureTime = `${String(depHour).padStart(2, '0')}:00`;

    const tourName = `${cityName} Scenic Tour`;

    await SightseeingTour.create({
      worldMembershipId: airline.id,
      name: tourName,
      baseAirportId: baseAirport.id,
      waypoints,
      distanceNm,
      durationMin,
      assignedAircraftId: userAircraft.id,
      ticketPrice,
      scheduledDepartureTime,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // daily
      isActive: true
    });

    aiLog(`[AI-DECISION] ${airline.airlineName} created sightseeing tour "${tourName}" (${Math.round(distanceNm)}nm, ${durationMin}min, $${ticketPrice}/seat)`);
  } catch (err) {
    console.error(`[AI-DECISION] Sightseeing tour creation error for ${airline.airlineName}:`, err.message);
  }
}

module.exports = {
  processAIDecisions,
  estimateTypeAverageSalePrice
};
