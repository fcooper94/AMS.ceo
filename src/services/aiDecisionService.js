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

const { WorldMembership, Route, UserAircraft, Aircraft, Airport, ScheduledFlight, Notification } = require('../models');
const { Op } = require('sequelize');
const { AI_DIFFICULTY, AIRLINE_ARCHETYPES, pickPersonality, pickArchetype } = require('../data/aiDifficultyConfig');
const { pickAIContractorTier } = require('../data/contractorConfig');
const eraEconomicService = require('./eraEconomicService');
const routeDemandService = require('./routeDemandService');
const airportSlotService = require('./airportSlotService');

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
  const fuelMultiplier = eraEconomicService.getFuelCostMultiplier(worldYear);
  const eraMultiplier = eraEconomicService.getEraMultiplier(worldYear);
  const fuelCost = Math.round(distance * 2 * 2.5 * fuelMultiplier * eraMultiplier);
  const crewCost = Math.round(distance * 2 * 0.30 * eraMultiplier);
  const maintenanceCost = Math.round(distance * 2 * 0.20 * eraMultiplier);
  const airportFees = Math.round((800 + paxCapacity * 2) * eraMultiplier);
  const totalCost = fuelCost + crewCost + maintenanceCost + airportFees;
  const estimatedPax = Math.round(paxCapacity * 0.75);
  return estimatedPax > 0 ? Math.round(totalCost / estimatedPax) : totalCost;
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
    const decisionIntervalMs = config.decisionIntervalGameDays * 24 * 60 * 60 * 1000;

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

  // Count routes per aircraft
  const routesPerAircraft = {};
  for (const route of routes) {
    if (route.assignedAircraftId) {
      routesPerAircraft[route.assignedAircraftId] = (routesPerAircraft[route.assignedAircraftId] || 0) + 1;
    }
  }
  const unassignedAircraft = fleet.filter(ac => !routesPerAircraft[ac.id]);

  // Assess financial health
  const totalRevenue = routes.reduce((sum, r) => sum + (parseFloat(r.totalRevenue) || 0), 0);
  const totalCosts = routes.reduce((sum, r) => sum + (parseFloat(r.totalCosts) || 0), 0);
  const isProfitable = totalRevenue > totalCosts || routes.length === 0;

  // Average route profitability (for expansion gate)
  const avgProfitPerRoute = routes.length > 0
    ? (totalRevenue - totalCosts) / routes.length
    : 0;

  // 1. Create routes for unassigned aircraft
  if (unassignedAircraft.length > 0) {
    await tryCreateRoutes(airline, world, config, unassignedAircraft, routes, gameTime, worldYear);
  }

  // 2. Expand if profitable AND average route profitability is positive
  const startingCapital = eraEconomicService.getStartingCapital(worldYear);
  const expansionThreshold = startingCapital * 0.3;
  const isFreshStart = fleet.length === 0 && routes.length === 0;
  const shouldExpand = isProfitable && avgProfitPerRoute >= 0;

  if (shouldExpand && balance > expansionThreshold && fleet.length < config.maxFleetSize) {
    if (isFreshStart || Math.random() < 0.3) {
      await tryBuyAircraft(airline, world, config, fleet, worldYear, gameTime);
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
      await tryContractNetwork(airline, routes, config, world, gameTime);
    }

    if (balance < -startingCapital * 1.5 || (routes.length === 0 && fleet.length === 0)) {
      console.log(`[AI-DECISION] ${airline.airlineName} has gone bankrupt (balance: $${Math.round(balance)})`);
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

  // 6. Competitive response (medium/hard only)
  if (routes.length > 0 && config.competitiveResponseChance > 0) {
    await checkCompetitiveResponse(airline, routes, config, world, gameTime, worldYear);
  }

  // 7. Adjust pricing (competition-aware)
  if (routes.length > 0) {
    await adjustPricing(airline, routes, config, worldYear, world, gameTime);
  }

  // Update last decision time
  airline.aiLastDecisionTime = gameTime;
  await airline.save();
}

/**
 * Try to create routes for aircraft that have none.
 * Includes player targeting, smart frequency, smart departure times, proper range check.
 */
async function tryCreateRoutes(airline, world, config, unassignedAircraft, existingRoutes, gameTime, worldYear) {
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
        frequency: smartFreq,
        daysOfWeek: smartDays,
        demand: demandScore,
        ticketPrice: economyPrice,
        economyPrice,
        economyPlusPrice: Math.round(economyPrice * 1.3),
        businessPrice,
        firstPrice,
        cargoLightRate: Math.round(distance * 0.5),
        cargoStandardRate: Math.round(distance * 0.8),
        cargoHeavyRate: Math.round(distance * 1.2),
        transportType: archetype.transportType || 'both',
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

      await scheduleAIFlights(route, aircraft);

      const freqLabel = smartDays.length === 7 ? 'daily' : `${smartDays.length}x/week`;
      console.log(`[AI-DECISION] ${airline.airlineName} created route ${outboundNum}: ${baseAirport.icaoCode}-${destAirport.icaoCode} (${distance}nm, ${freqLabel})`);

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
    typeFiltered = eraAircraft.filter(ac => ac.passengerCapacity > 0);
  }
  if (typeFiltered.length === 0) return;
  const paxAircraft = typeFiltered;

  const maxSpend = balance * 0.4;
  const affordable = paxAircraft.filter(ac => {
    const price = parseFloat(ac.purchasePrice) || 50000000;
    return price <= maxSpend;
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

  const purchasePrice = parseFloat(chosen.purchasePrice) || 50000000;

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
    await UserAircraft.create({
      worldMembershipId: airline.id,
      aircraftId: chosen.id,
      registration: reg,
      acquisitionType: 'purchase',
      purchasePrice,
      totalFlightHours: 0,
      autoScheduleDaily: true,
      autoScheduleWeekly: true,
      lastDailyCheckDate: new Date(gameTime || new Date()),
      lastWeeklyCheckDate: new Date(gameTime || new Date()),
      lastACheckDate: new Date(gameTime || new Date()),
      lastACheckHours: 0,
      lastCCheckDate: new Date(gameTime || new Date()),
      lastDCheckDate: new Date(gameTime || new Date())
    });

    airline.balance = parseFloat(airline.balance) - purchasePrice;
    await airline.save();

    console.log(`[AI-DECISION] ${airline.airlineName} purchased ${chosen.manufacturer} ${chosen.model} (${reg}) for $${(purchasePrice / 1000000).toFixed(1)}M`);

    await notifyPlayer(world.id,
      `${airline.airlineName} Acquired Aircraft`,
      `${airline.airlineName} purchased a ${chosen.manufacturer} ${chosen.model}${chosen.variant ? ' ' + chosen.variant : ''} (${reg}).`,
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
async function tryContractNetwork(airline, routes, config, world, gameTime) {
  // Find worst-performing route (by revenue/cost ratio, not absolute profit)
  let worstRoute = null;
  let worstRatio = Infinity;

  for (const route of routes) {
    const flights = parseInt(route.totalFlights) || 0;
    if (flights < 3) continue; // Give new routes time to mature
    const revenue = parseFloat(route.totalRevenue) || 0;
    const costs = parseFloat(route.totalCosts) || 0;
    const ratio = costs > 0 ? revenue / costs : 1;
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worstRoute = route;
    }
  }

  if (!worstRoute) return;

  try {
    worstRoute.isActive = false;
    await worstRoute.save();

    await ScheduledFlight.destroy({
      where: { routeId: worstRoute.id }
    });

    console.log(`[AI-DECISION] ${airline.airlineName} cancelled route ${worstRoute.routeNumber} (rev/cost ratio: ${worstRatio.toFixed(2)})`);

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

module.exports = {
  processAIDecisions
};
